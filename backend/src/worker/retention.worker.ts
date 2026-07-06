import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { runRetention } from '../services/retention.service.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'retention-worker');

async function processRetentionJob(job: Job): Promise<void> {
  const jobId = job.id || 'unknown';

  logger.info({ jobId }, 'Starting retention job');

  try {
    const result = await runRetention();

    logger.info(
      {
        jobId,
        result,
      },
      'Retention job completed successfully'
    );
  } catch (error) {
    logger.error({ err: error, jobId }, 'Retention job failed');
    throw error; // Re-throw to let BullMQ handle retry
  }
}

export function createRetentionWorker(): Worker {
  const worker = new Worker('retention-queue', processRetentionJob, {
    connection: redis,
    concurrency: 1, // Only one retention job at a time
    lockDuration: 600000, // 10 minutes (retention can take a while)
  });

  // Event handlers
  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Retention job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Retention job failed');
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Retention worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Retention job stalled');
  });

  logger.info({ concurrency: 1 }, 'Retention worker created and ready');

  return worker;
}