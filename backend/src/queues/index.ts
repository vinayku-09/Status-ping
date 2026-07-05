/**
 * BullMQ queue instances
 * All queues share the same Redis connection
 */

import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('api', 'queues');

/**
 * Ping queue - executes HTTP health checks
 */
export const pingQueue = new Queue('ping-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Incident queue - evaluates and manages incidents
 */
export const incidentQueue = new Queue('incident-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
});

/**
 * Notification queue - sends email and webhook notifications
 */
export const notificationQueue = new Queue('notification-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

/**
 * Retention queue - data aggregation and cleanup
 */
export const retentionQueue = new Queue('retention-queue', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 10,
    removeOnFail: 10,
  },
});

// Log queue events
[pingQueue, incidentQueue, notificationQueue, retentionQueue].forEach((queue) => {
  queue.on('error', (error) => {
    logger.error({ err: error, queue: queue.name }, 'Queue error');
  });
});

logger.info('All queues initialized');