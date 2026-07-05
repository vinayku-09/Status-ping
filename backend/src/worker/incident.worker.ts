import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { notificationQueue } from '../queues/index.js';
import { evaluateIncident } from '../services/incident.service.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'incident-worker');

// Job data structure for incident jobs

interface IncidentJobData {
  monitorId: string;
  isUp: boolean;
  pingLogId: number;
}

/**
 * Process an incident evaluation job
 * 1. Evaluate incident based on ping result
 * 2. Enqueue notifications based on action taken
 * 
 * @param job - BullMQ job
 */
async function processIncidentJob(job: Job<IncidentJobData>): Promise<void> {
  const { monitorId, isUp, pingLogId } = job.data;
  const jobId = job.id || 'unknown';

  logger.debug({ jobId, monitorId, isUp, pingLogId }, 'Processing incident job');

  try {
    // Evaluate incident
    const result = await evaluateIncident(monitorId, isUp);

    logger.info(
      { jobId, monitorId, action: result.action, isUp },
      `Incident evaluation: ${result.action}`
    );

    // Handle based on action
    switch (result.action) {
      case 'created':
        // Incident opened - enqueue notification
        await notificationQueue.add('send', {
          incidentId: result.incidentId,
          eventType: 'opened',
          monitorId,
        });

        logger.info(
          { jobId, monitorId, incidentId: result.incidentId },
          'Incident opened notification enqueued'
        );
        break;

      case 'resolved':
        // Incident resolved - enqueue notification
        await notificationQueue.add('send', {
          incidentId: result.incidentId,
          eventType: 'resolved',
          monitorId,
        });

        logger.info(
          { jobId, monitorId, incidentId: result.incidentId },
          'Incident resolved notification enqueued'
        );
        break;

      case 'duplicate':
        // Incident already exists, nothing to do
        logger.info({ jobId, monitorId }, 'Incident already open, skipping');
        break;

      case 'none':
        // No action needed
        logger.debug({ jobId, monitorId }, 'No incident action needed');
        break;
    }
  } catch (error) {
    logger.error({ err: error, jobId, monitorId }, 'Incident job failed');
    throw error; // Re-throw to let BullMQ handle retry
  }
}

/**
 * Create and configure the incident worker
 * @returns Configured BullMQ worker
 */
export function createIncidentWorker(): Worker {
  const worker = new Worker<IncidentJobData>('incident-queue', processIncidentJob, {
    connection: redis,
    concurrency: 5,
    lockDuration: 30000, // 30 seconds
  });

  // Event handlers
  worker.on('completed', (job) => {
    logger.debug(
      { jobId: job.id, monitorId: job.data.monitorId },
      'Incident job completed'
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, monitorId: job?.data.monitorId, err },
      'Incident job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Incident worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Incident job stalled');
  });

  logger.info({ concurrency: 5 }, 'Incident worker created and ready');

  return worker;
}