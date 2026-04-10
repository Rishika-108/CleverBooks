import Job from '../models/Job.js';
import { runReconciliation } from '../services/reconciliationEngine.js';

export const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).limit(10);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerReconciliation = async (req, res) => {
  try {
    runReconciliation().catch(err => console.error('Reconciliation Error:', err));
    res.json({ message: 'Reconciliation job triggered.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
