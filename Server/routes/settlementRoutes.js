import express from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { uploadSettlements, getSettlements } from '../controllers/settlementController.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Point 16: Rate Limit: 5 requests/minute on upload endpoint
const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many uploads from this IP, please try again after a minute' }
});

router.post('/upload', uploadLimiter, upload.single('file'), uploadSettlements);
router.get('/', getSettlements);

export default router;
