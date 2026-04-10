import cron from 'node-cron';
import { runReconciliation } from './reconciliationEngine.js';

cron.schedule('0 2 * * *', async () => {
  console.log('Running nightly reconciliation...');
  try {
    await runReconciliation();
    console.log('Nightly reconciliation completed.');
  } catch (error) {
    console.error('Nightly reconciliation failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata'
});

console.log('Cron service initialized.');
