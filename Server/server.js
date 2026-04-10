import './config/env.js';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import settlementRoutes from './routes/settlementRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import './services/cronService.js'; // Initialize cron jobs
// Note: Worker is run as a separate process (services/notificationWorker.js)

// Connect to Database
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/settlements', settlementRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
