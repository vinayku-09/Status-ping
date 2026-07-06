import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { sendEmailNotification, sendWebhookNotification } from '../services/notification.service.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'notification-worker');

// Job data structure for notification jobs
interface NotificationJobData {
  incidentId: string;
  eventType: 'opened' | 'resolved';
  monitorId: string;
}

// Get cooldown key for Redis

function getCooldownKey(monitorId: string, configId: string): string {
  return `cooldown:${monitorId}:${configId}`;
}

async function shouldSuppressNotification(
  monitorId: string,
  configId: string,
  eventType: 'opened' | 'resolved'
): Promise<boolean> {
  // Resolved notifications always bypass cooldown
  if (eventType === 'resolved') {
    return false;
  }

  // Check Redis for cooldown key
  const cooldownKey = getCooldownKey(monitorId, configId);
  const cooldownExists = await redis.exists(cooldownKey);

  return cooldownExists === 1;
}

async function setCooldown(monitorId: string, configId: string): Promise<void> {
  const cooldownKey = getCooldownKey(monitorId, configId);
  await redis.setex(cooldownKey, env.NOTIFICATION_COOLDOWN_SECONDS, '1');

  logger.debug(
    { monitorId, configId, ttl: env.NOTIFICATION_COOLDOWN_SECONDS },
    'Cooldown set'
  );
}

async function clearCooldown(monitorId: string, configId: string): Promise<void> {
  const cooldownKey = getCooldownKey(monitorId, configId);
  await redis.del(cooldownKey);

  logger.debug({ monitorId, configId }, 'Cooldown cleared');
}

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { incidentId, eventType, monitorId } = job.data;
  const jobId = job.id || 'unknown';

  logger.debug({ jobId, incidentId, eventType, monitorId }, 'Processing notification job');

  try {
    // Fetch incident with monitor data
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            userId: true,
          },
        },
      },
    });

    if (!incident) {
      logger.warn({ jobId, incidentId }, 'Incident not found, skipping notification');
      return;
    }

    // Fetch notification configs for this monitor
    const configs = await prisma.notificationConfig.findMany({
      where: {
        monitorId,
        deletedAt: null,
        // Filter by event preference
        ...(eventType === 'opened'
          ? { onIncidentOpen: true }
          : { onIncidentResolve: true }),
      },
    });

    if (configs.length === 0) {
      logger.info(
        { jobId, incidentId, eventType, monitorId },
        'No notification configs found for this event type'
      );
      return;
    }

    logger.info(
      { jobId, incidentId, eventType, configCount: configs.length },
      `Sending ${configs.length} notification(s)`
    );

    // Process each notification config
    for (const config of configs) {
      try {
        // Check cooldown
        const shouldSuppress = await shouldSuppressNotification(
          monitorId,
          config.id,
          eventType
        );

        if (shouldSuppress) {
          logger.info(
            { jobId, incidentId, configId: config.id, eventType },
            'Notification suppressed due to cooldown'
          );

          // Create notification log with suppressed status
          await prisma.notificationLog.create({
            data: {
              notificationConfigId: config.id,
              incidentId,
              eventType,
              status: 'suppressed',
              attempts: 0,
            },
          });

          continue;
        }

        // Create notification log with pending status
        const notificationLog = await prisma.notificationLog.create({
          data: {
            notificationConfigId: config.id,
            incidentId,
            eventType,
            status: 'pending',
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        });

        logger.debug(
          { jobId, notificationLogId: notificationLog.id, configId: config.id },
          'Notification log created'
        );

        // Send notification based on type
        try {
          if (config.type === 'email') {
            await sendEmailNotification(config, incident, eventType);
          } else if (config.type === 'webhook') {
            await sendWebhookNotification(config, incident, eventType);
          } else {
            throw new Error(`Unknown notification type: ${config.type}`);
          }

          // Update notification log to delivered
          await prisma.notificationLog.update({
            where: { id: notificationLog.id },
            data: {
              status: 'delivered',
              deliveredAt: new Date(),
            },
          });

          logger.info(
            { jobId, notificationLogId: notificationLog.id, type: config.type },
            'Notification delivered successfully'
          );

          // Set cooldown after successful delivery (only for opened events)
          if (eventType === 'opened') {
            await setCooldown(monitorId, config.id);
          }

          // Clear cooldown on resolved events
          if (eventType === 'resolved') {
            await clearCooldown(monitorId, config.id);
          }
        } catch (error) {
          // Update notification log to failed
          await prisma.notificationLog.update({
            where: { id: notificationLog.id },
            data: {
              status: 'failed',
              errorMessage:
                error instanceof Error ? error.message.substring(0, 500) : 'Unknown error',
            },
          });

          logger.error(
            { err: error, jobId, notificationLogId: notificationLog.id },
            'Notification delivery failed'
          );

          // Re-throw to trigger BullMQ retry
          throw error;
        }
      } catch (error) {
        logger.error(
          { err: error, jobId, configId: config.id },
          'Error processing notification config'
        );
        // Don't throw - continue with other configs
      }
    }
  } catch (error) {
    logger.error({ err: error, jobId, incidentId }, 'Notification job failed');
    throw error; // Re-throw to let BullMQ handle retry
  }
}

export function createNotificationWorker(): Worker {
  const worker = new Worker<NotificationJobData>('notification-queue', processNotificationJob, {
    connection: redis,
    concurrency: 3,
    lockDuration: 60000, // 60 seconds (emails can be slow)
  });

  // Event handlers
  worker.on('completed', (job) => {
    logger.debug(
      { jobId: job.id, incidentId: job.data.incidentId },
      'Notification job completed'
    );
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, incidentId: job?.data.incidentId, err },
      'Notification job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Notification worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Notification job stalled');
  });

  logger.info({ concurrency: 3 }, 'Notification worker created and ready');

  return worker;
}