import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_PASSWORD ? {} : undefined, // Upstash/Cloud Redis needs TLS
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    // Suppress spammy logs if redis is missing, but warn the user once.
    console.warn('⚠️  Redis is NOT running. Discrepancy events will NOT be queued.');
    console.warn('   To fix this, install and start Redis (https://github.com/microsoftarchive/redis/releases), or run via Docker.');
  } else {
    console.error('Redis Error:', err.message);
  }
});

export const notificationQueue = new Queue('discrepancy-events', { 
  connection: redisConnection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: false } 
});
