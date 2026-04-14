import '../config/env.js';
import connectDB from '../config/db.js';
import { Worker } from 'bullmq';
import { redisConnection } from './queueService.js';
import Notification from '../models/Notification.js';

// Initialize Database Connection
connectDB();

/**
 * Point 12: External Notification API Choice
 * We use a Mock API approach with detailed logging to simulate a real provider like SendGrid or Webhook.site.
 * Documentation:
 * - Mock Endpoint: https://webhook.site/mock-reconciliation-alert (Simulated)
 * - Payload Format: JSON { awbNumber, merchantId, discrepancyType, message }
 */
const mockExternalApi = async (payload) => {
  return new Promise((resolve, reject) => {
     console.log(`[EXTERNAL API] Calling notification provider for AWB: ${payload.awbNumber}...`);
     setTimeout(() => {
        // Simulate transient network failure (20% chance)
        if (Math.random() < 0.2) {
           reject(new Error("External API Connection Timeout"));
        } else {
           resolve({ success: true, message: 'Delivered' });
        }
     }, 1000);
  });
};

const worker = new Worker('discrepancy-events', async job => {
  const { awbNumber, merchantId, discrepancyType, idempotencyKey } = job.data;
  
  // Point 5: Notification Idempotency check in DB
  let notification = await Notification.findOne({ 
     awbNumber, 
     merchantId,
     'payload.discrepancyType': discrepancyType
  });

  if (notification && notification.status === 'SENT') {
    console.log(`[IDEMPOTENCY] Notification already sent for ${awbNumber} - ${discrepancyType}. Skipping.`);
    return;
  }

  if (!notification) {
    notification = await Notification.create({
      awbNumber,
      merchantId,
      status: 'PENDING',
      payload: job.data,
      attempts: 0
    });
  }

  try {
    notification.attempts += 1;
    notification.lastAttemptAt = new Date();
    
    // Point 6: Explicit tracking of retry attempts
    if (notification.attempts > 1) {
       notification.status = 'RETRYING';
    }
    await notification.save();

    await mockExternalApi(job.data);
    
    notification.status = 'SENT';
    notification.error = null;
    await notification.save();
    console.log(`[SUCCESS] Notification sent for AWB: ${awbNumber}`);

  } catch (error) {
    console.error(`[FAILURE] Notification attempt ${notification.attempts} failed for ${awbNumber}: ${error.message}`);
    notification.error = error.message;
    
    // BullMQ will handle the retry based on our queue configuration (max 5 attempts)
    if (notification.attempts >= 5) {
       notification.status = 'FAILED';
    } else {
       notification.status = 'RETRYING';
       await notification.save();
       throw error; // Rethrow to trigger BullMQ retry
    }
    await notification.save();
  }
}, { 
  connection: redisConnection
});

worker.on('failed', (job, err) => {
  console.log(`[FATAL] Job ${job.id} failed after all retries: ${err.message}`);
});

console.log('Notification worker initialized and listening on discrepancy-events queue.');
