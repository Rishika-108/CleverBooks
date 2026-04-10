import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  awbNumber: { type: String, required: true, index: true },
  batchId: { type: String, required: true, index: true },
  settledCodAmount: { type: Number, required: true },
  chargedWeight: { type: Number, required: true },
  forwardCharge: { type: Number, required: true },
  rtoCharge: { type: Number, required: true },
  codHandlingFee: { type: Number, required: true },
  settlementDate: { type: Date },
  
  status: { type: String, enum: ['MATCHED', 'DISCREPANCY', 'PENDING_REVIEW', 'PENDING'], default: 'PENDING', index: true },
  discrepancies: [{
    type: { type: String },
    expected: Number,
    actual: Number,
    message: String
  }],
  processedAt: { type: Date }
}, { timestamps: true });

settlementSchema.index({ awbNumber: 1, batchId: 1 }, { unique: true });

export default mongoose.model('Settlement', settlementSchema);
