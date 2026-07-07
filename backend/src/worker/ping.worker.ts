import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { incidentQueue } from '../queues/index.js';
import { executePing } from '../services/ping.service.js';
import { checkSsl, shouldCheckSsl } from '../services/ssl.service.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('worker', 'ping-worker');

// Job data structure for ping jobs

interface PingJobData {
  monitorId: string;
}

/**
 * Process a ping job
 * 1. Fetch monitor from database
 * 2. Check if monitor is deleted or job is stale
 * 3. Execute ping
 * 4. Write ping log
 * 5. Enqueue incident evaluation
 * 6. Optionally check SSL certificate
 * 
 * @param job - BullMQ job
 */
async function processPingJob(job: Job<PingJobData>): Promise<void> {
  const { monitorId } = job.data;
  const jobId = job.id || 'unknown';

  logger.debug({ jobId, monitorId }, 'Processing ping job');

  try {
    // Fetch monitor
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    // Discard if monitor not found or deleted
    if (!monitor || monitor.deletedAt) {
      logger.warn(
        { jobId, monitorId, deleted: !!monitor?.deletedAt },
        'Monitor not found or deleted, discarding job'
      );
      return;
    }

    // Check job staleness (discard if older than 2x check interval)
    const jobAge = Date.now() - (job.timestamp || Date.now());
    const maxAge = monitor.checkIntervalMinutes * 2 * 60 * 1000;

    if (jobAge > maxAge) {
      logger.warn(
        { jobId, monitorId, jobAge, maxAge },
        'Job is stale, discarding'
      );
      return;
    }

    // Execute ping
    logger.info({ jobId, monitorId, url: monitor.url }, 'Executing ping');
    const pingResult = await executePing(monitor);

    // Write ping log
    const pingLog = await prisma.pingLog.create({
      data: {
        monitorId,
        checkedAt: new Date(),
        isUp: pingResult.isUp,
        statusCode: pingResult.statusCode,
        responseTimeMs: pingResult.responseTimeMs,
        errorType: pingResult.errorType,
        redirectCount: pingResult.redirectCount,
        finalUrl: pingResult.finalUrl !== monitor.url ? pingResult.finalUrl : null,
      },
    });

    // Update monitor last checked timestamp
    await prisma.monitor.update({
      where: { id: monitorId },
      data: { lastCheckedAt: new Date() },
    });

    logger.info(
      {
        jobId,
        monitorId,
        pingLogId: pingLog.id,
        isUp: pingResult.isUp,
        responseTimeMs: pingResult.responseTimeMs,
        statusCode: pingResult.statusCode,
        errorType: pingResult.errorType,
      },
      `Ping result: ${pingResult.isUp ? 'UP' : 'DOWN'} ${pingResult.responseTimeMs}ms`
    );

    // Enqueue incident evaluation
    await incidentQueue.add('evaluate', {
      monitorId,
      isUp: pingResult.isUp,
      pingLogId: pingLog.id,
    });

    logger.debug({ jobId, monitorId, pingLogId: pingLog.id }, 'Incident evaluation enqueued');

    // SSL check (if HTTPS and not checked in last 24 hours)
    if (monitor.url.startsWith('https://')) {
      // Get last SSL check
      const lastSslCheck = await prisma.sslCheck.findFirst({
        where: { monitorId },
        orderBy: { checkedAt: 'desc' },
      });

      if (shouldCheckSsl(monitor.url, lastSslCheck?.checkedAt || null)) {
        logger.debug({ jobId, monitorId }, 'Performing SSL check');

        try {
          const sslResult = await checkSsl(monitor.url);

          // Write SSL check result
          await prisma.sslCheck.create({
            data: {
              monitorId,
              checkedAt: new Date(),
              expiresAt: sslResult.expiresAt,
              daysRemaining: sslResult.daysRemaining,
              issuer: sslResult.issuer,
              isValid: sslResult.isValid,
              errorMessage: sslResult.errorMessage,
            },
          });

          logger.info(
            {
              jobId,
              monitorId,
              isValid: sslResult.isValid,
              daysRemaining: sslResult.daysRemaining,
            },
            'SSL check completed'
          );

          // Enqueue SSL expiry warning notification if <= 30 days
          if (
            sslResult.isValid &&
            sslResult.daysRemaining !== null &&
            sslResult.daysRemaining <= 30
          ) {
            logger.warn(
              { monitorId, daysRemaining: sslResult.daysRemaining },
              'SSL certificate expiring soon'
            );

            // Note: SSL expiry notifications would be handled by a separate notification type
            // For now, we just log the warning
            // In a full implementation, you would enqueue a notification job here
          }
        } catch (error) {
          logger.error({ err: error, jobId, monitorId }, 'SSL check failed');
          // Don't fail the entire job just because SSL check failed
        }
      }
    }
  } catch (error) {
    logger.error({ err: error, jobId, monitorId }, 'Ping job failed');
    throw error; // Re-throw to let BullMQ handle retry
  }
}

/**
 * Create and configure the ping worker
 * @returns Configured BullMQ worker
 */
export function createPingWorker(): Worker {
  const worker = new Worker<PingJobData>('ping-queue', processPingJob, {
    connection: redis,
    concurrency: env.PING_WORKER_CONCURRENCY,
    lockDuration: 30000, // 30 seconds
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // Per 1 second (to prevent API rate limits)
    },
  });

  // Event handlers
  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id, monitorId: job.data.monitorId }, 'Ping job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, monitorId: job?.data.monitorId, err },
      'Ping job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ err }, 'Ping worker error');
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Ping job stalled');
  });

  logger.info(
    { concurrency: env.PING_WORKER_CONCURRENCY },
    'Ping worker created and ready'
  );

  return worker;
}