/**
 * Queue helper functions
 * Utilities for managing BullMQ jobs and repeatable schedules
 */

import { Queue } from 'bullmq';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('api', 'queue-helpers');

/**
 * Register or update a monitor's repeatable ping job
 * Removes any existing job first to ensure clean registration
 * 
 * @param pingQueue - BullMQ ping queue instance
 * @param monitorId - Monitor ID
 * @param intervalMinutes - Check interval in minutes
 */
export async function registerMonitorJob(
  pingQueue: Queue,
  monitorId: string,
  intervalMinutes: number
): Promise<void> {
  try {
    const jobId = `monitor:${monitorId}`;

    logger.debug({ monitorId, intervalMinutes, jobId }, 'Registering monitor job');

    // Remove existing repeatable job if it exists
    await removeMonitorJob(pingQueue, monitorId);

    // Add new repeatable job
    await pingQueue.add(
      'ping',
      { monitorId },
      {
        jobId,
        repeat: {
          every: intervalMinutes * 60 * 1000, // Convert minutes to milliseconds
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
      }
    );

    logger.info(
      { monitorId, intervalMinutes, jobId },
      'Monitor job registered successfully'
    );
  } catch (error) {
    logger.error(
      { err: error, monitorId, intervalMinutes },
      'Failed to register monitor job'
    );
    throw error;
  }
}

/**
 * Remove a monitor's repeatable ping job
 * 
 * @param pingQueue - BullMQ ping queue instance
 * @param monitorId - Monitor ID
 */
export async function removeMonitorJob(pingQueue: Queue, monitorId: string): Promise<void> {
  try {
    const jobId = `monitor:${monitorId}`;

    logger.debug({ monitorId, jobId }, 'Removing monitor job');

    // Get all repeatable jobs
    const repeatableJobs = await pingQueue.getRepeatableJobs();

    // Find and remove jobs matching this monitor
    for (const job of repeatableJobs) {
      if (job.id === jobId || job.key.includes(monitorId)) {
        await pingQueue.removeRepeatableByKey(job.key);
        logger.info({ monitorId, jobKey: job.key }, 'Removed repeatable job');
      }
    }

    // Also try to remove by job ID if it exists as a delayed job
    const job = await pingQueue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info({ monitorId, jobId }, 'Removed delayed job');
    }
  } catch (error) {
    logger.error({ err: error, monitorId }, 'Failed to remove monitor job');
    throw error;
  }
}

/**
 * Enqueue an immediate ping job for a monitor
 * Used when creating a monitor or manually triggering a check
 * 
 * @param pingQueue - BullMQ ping queue instance
 * @param monitorId - Monitor ID
 */
export async function enqueueImmediatePing(
  pingQueue: Queue,
  monitorId: string
): Promise<void> {
  try {
    logger.debug({ monitorId }, 'Enqueuing immediate ping');

    await pingQueue.add(
      'ping-immediate',
      { monitorId },
      {
        priority: 1, // High priority
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    logger.info({ monitorId }, 'Immediate ping enqueued');
  } catch (error) {
    logger.error({ err: error, monitorId }, 'Failed to enqueue immediate ping');
    throw error;
  }
}