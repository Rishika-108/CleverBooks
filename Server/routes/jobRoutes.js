import express from 'express';
import { getJobs, triggerReconciliation } from '../controllers/jobController.js';

const router = express.Router();

router.get('/', getJobs);
router.post('/run', triggerReconciliation);

export default router;
