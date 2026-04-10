import fs from 'fs';
import { parseCSV } from '../services/csvParser.js';
import Settlement from '../models/Settlement.js';

export const uploadSettlements = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const data = await parseCSV(req.file.path);
    fs.unlinkSync(req.file.path);

    // Point 9: Max 1,000 records per upload
    if (data.length > 1000) {
      return res.status(400).json({ error: 'Upload exceeds maximum limit of 1,000 records.' });
    }
    
    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Point 4: Skip reconciliation if batch already processed
    // (We do this per record since a batch might be partially uploaded)
    
    for (const row of data) {
      try {
        if (!row.awbNumber || !row.batchId) {
          throw new Error('Missing awbNumber or batchId');
        }

        const doc = {
          awbNumber: row.awbNumber,
          batchId: row.batchId,
          settledCodAmount: Number(row.settledCodAmount) || 0,
          chargedWeight: Number(row.chargedWeight) || 0,
          forwardCharge: Number(row.forwardCharge) || 0,
          rtoCharge: Number(row.rtoCharge) || 0,
          codHandlingFee: Number(row.codHandlingFee) || 0,
          settlementDate: row.settlementDate ? new Date(row.settlementDate) : null,
          status: 'PENDING'
        };
        
        // Point 4 & 15: Partial failures / Idempotency
        const result = await Settlement.updateOne(
          { awbNumber: doc.awbNumber, batchId: doc.batchId },
          { $setOnInsert: doc },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      } catch (err) {
        // Point 15: Continue processing valid records, log failed records separately
        errors.push({ awb: row.awbNumber, error: err.message });
        skippedCount++;
      }
    }
    
    res.json({ 
      message: `Processed ${data.length} records.`, 
      insertedCount, 
      skippedCount,
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
};

export const getSettlements = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = status ? { status } : {};
    
    const settlements = await Settlement.find(filter)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
      
    const total = await Settlement.countDocuments(filter);
    
    res.json({ settlements, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
