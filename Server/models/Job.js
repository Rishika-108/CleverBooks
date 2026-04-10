import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  runAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['SUCCESS', 'FAILED', 'RUNNING'], default: 'RUNNING' },
  recordsProcessed: { type: Number, default: 0 },
  discrepanciesFound: { type: Number, default: 0 },
  logs: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('Job', jobSchema);
