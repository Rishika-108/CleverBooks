import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  awbNumber: { type: String, required: true },
  merchantId: { type: String, required: true },
  status: { type: String, enum: ['SENT', 'FAILED', 'RETRYING', 'PENDING'], default: 'PENDING' },
  payload: { type: mongoose.Schema.Types.Mixed },
  attempts: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  error: { type: String }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
