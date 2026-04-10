import Settlement from '../models/Settlement.js';
import Order from '../models/Order.js';
import Job from '../models/Job.js';
import { notificationQueue } from './queueService.js';
import crypto from 'crypto';

export const runReconciliation = async () => {
  const jobId = crypto.randomUUID();
  const job = await Job.create({ jobId, runAt: new Date(), status: 'RUNNING' });
  const logs = [];

  try {
    // Optimization: Find all PENDING settlements
    const settlements = await Settlement.find({ status: { $in: ['PENDING', 'PENDING_REVIEW'] } });
    
    if (settlements.length === 0) {
      job.status = 'SUCCESS';
      job.logs.push('No pending settlements to process.');
      await job.save();
      return job;
    }

    // Optimization: Batch fetch orders using $in on awbNumber
    const awbNumbers = settlements.map(s => s.awbNumber);
    const orders = await Order.find({ awbNumber: { $in: awbNumbers } });
    const orderMap = new Map(orders.map(o => [o.awbNumber, o]));

    // Optimization: Batch fetch existing settlements to detect duplicates across batches (Point 18)
    const existingSettlements = await Settlement.find({ 
      awbNumber: { $in: awbNumbers },
      status: { $ne: 'PENDING' }
    });
    const processedAwbMap = new Map();
    existingSettlements.forEach(s => {
      if (!processedAwbMap.has(s.awbNumber)) {
        processedAwbMap.set(s.awbNumber, s.batchId);
      }
    });

    let recordsProcessed = 0;
    let discrepanciesFound = 0;

    for (const settlement of settlements) {
      recordsProcessed++;
      const order = orderMap.get(settlement.awbNumber);
      const discrepancies = [];

      // Point 18: Duplicate Settlement Detection
      if (processedAwbMap.has(settlement.awbNumber) && processedAwbMap.get(settlement.awbNumber) !== settlement.batchId) {
        discrepancies.push({
          type: 'DUPLICATE_SETTLEMENT',
          message: `AWB already settled in batch ${processedAwbMap.get(settlement.awbNumber)}`
        });
      }

      // Point 2: Invalid AWB Handling
      if (!order) {
        discrepancies.push({
          type: 'ORDER_NOT_FOUND',
          message: 'No matching order found for AWB'
        });
        settlement.status = 'PENDING_REVIEW';
      } else {
        // Point 1: Settlement Status Handling (Critical fields check)
        if (!order.deliveryDate && order.orderStatus === 'DELIVERED') {
           discrepancies.push({
             type: 'MISSING_DATA',
             message: 'Order status is DELIVERED but deliveryDate is missing.'
           });
           settlement.status = 'PENDING_REVIEW';
        }

        // Rule 1: COD Shortfall
        const tolerance = Math.min(order.codAmount * 0.02, 10);
        if (settlement.settledCodAmount < order.codAmount - tolerance) {
          discrepancies.push({
            type: 'COD_SHORT',
            expected: order.codAmount,
            actual: settlement.settledCodAmount,
            message: `Short COD remittance. Expected: ${order.codAmount}, Actual: ${settlement.settledCodAmount}`
          });
        }

        // Rule 2: Weight Dispute
        if (settlement.chargedWeight > order.declaredWeight * 1.10) {
          discrepancies.push({
            type: 'WEIGHT_DISPUTE',
            expected: order.declaredWeight,
            actual: settlement.chargedWeight,
            message: `Charged weight (${settlement.chargedWeight}) exceeds declared (${order.declaredWeight}) by > 10%.`
          });
        }

        // Rule 3: Phantom RTO
        if (settlement.rtoCharge > 0 && order.orderStatus === 'DELIVERED') {
          discrepancies.push({
            type: 'PHANTOM_RTO',
            expected: 0,
            actual: settlement.rtoCharge,
            message: 'RTO charged but order status is DELIVERED.'
          });
        }

        // Rule 4: Overdue Remittance
        if (order.deliveryDate) {
          const now = new Date();
          const deliveryDate = new Date(order.deliveryDate);
          const diffDays = Math.floor((now - deliveryDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 14 && !settlement.settlementDate) {
            discrepancies.push({
              type: 'OVERDUE_REMITTANCE',
              expected: 14,
              actual: diffDays,
              message: `Remittance overdue by ${diffDays} days (allowed: 14 days).`
            });
          }
        }
      }

      if (discrepancies.length > 0) {
        // If not already set to PENDING_REVIEW by specific rules above
        if (settlement.status !== 'PENDING_REVIEW') {
          settlement.status = 'DISCREPANCY';
        }
        settlement.discrepancies = discrepancies;
        discrepanciesFound++;
        
        // Point 5: Notification Idempotency Key
        for (const disc of discrepancies) {
          const idempotencyKey = `${settlement.awbNumber}_${disc.type}`;
          
          await notificationQueue.add(
            'discrepancy-event',
            {
              awbNumber: settlement.awbNumber,
              merchantId: order ? order.merchantId : 'UNKNOWN',
              discrepancyType: disc.type,
              expectedValue: disc.expected,
              actualValue: disc.actual,
              message: disc.message,
              idempotencyKey, // Used by worker to prevent duplicates
              suggestedAction: "Raise dispute with courier"
            },
            {
              jobId: idempotencyKey, // BullMQ native idempotency
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 60000 
              },
              removeOnComplete: true
            }
          );
        }
      } else {
        settlement.status = 'MATCHED';
      }
      
      settlement.processedAt = new Date();
      await settlement.save();
    }

    job.status = 'SUCCESS';
    job.recordsProcessed = recordsProcessed;
    job.discrepanciesFound = discrepanciesFound;
    job.logs = logs;
    await job.save();
    
    return job;

  } catch (error) {
    console.error('Reconciliation failed:', error);
    job.status = 'FAILED';
    job.logs.push(error.message);
    job.logs.push(error.stack); // Point 8: Include stack trace
    await job.save();
    throw error;
  }
};
