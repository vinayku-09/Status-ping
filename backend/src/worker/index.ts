import { Worker } from 'bullmq';
import { prisma, connectDatabase, disconnectDatabase } from '../config/prisma.js';
import { redis, connectRedis, disconnectRedis } from '../config/redis.js';
import { env } from '../config/env.js';
import { retentionQueue, pingQueue } from '../queues/index.js';
import { registerMonitorJob } from '../queues/helpers.js';
import { createPingWorker } from './ping.worker.js';
import { createIncidentWorker } from './incident.worker.js';
import { createNotificationWorker } from './notification.worker.js';
import { createRetentionWorker } from './retention.worker.js';
import { workerLogger as logger } from '../lib/logger.js';
import http from 'http';

// Active workers
const workers: Worker[] = [];

// Health check server
let healthServer: http.Server | null = null;

/**
 * Re-register all active monitor jobs on startup
 * This is the disaster recovery mechanism for Redis data loss
 */
async function reRegisterMonitorJobs(): Promise<void> {
  logger.info('Re-registering monitor jobs on startup');

  try {
    // Fetch all monitors that should have active jobs
    const activeMonitors = await prisma.monitor.findMany({
      where: {
        status: {
          in: ['active', 'degraded', 'down'],
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        checkIntervalMinutes: true,
        status: true,
      },
    });

    logger.info({ count: activeMonitors.length }, 'Found active monitors to register');

    let successCount = 0;
    let failureCount = 0;

    for (const monitor of activeMonitors) {
      try {
        await registerMonitorJob(pingQueue, monitor.id, monitor.checkIntervalMinutes);
        successCount++;
        logger.debug(
          { monitorId: monitor.id, name: monitor.name },
          'Monitor job registered'
        );
      } catch (error) {
        failureCount++;
        logger.error(
          { err: error, monitorId: monitor.id, name: monitor.name },
          'Failed to register monitor job'
        );
      }
    }

    logger.info(
      { total: activeMonitors.length, success: successCount, failed: failureCount },
      'Monitor job re-registration complete'
    );
  } catch (error) {
    logger.error({ err: error }, 'Error during monitor job re-registration');
    throw error;
  }
}

/**
 * Register the retention cron job
 * Runs daily at 2am UTC
 */
async function registerRetentionJob(): Promise<void> {
  logger.info('Registering retention cron job');

  try {
    // Remove any existing retention jobs
    const repeatableJobs = await retentionQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await retentionQueue.removeRepeatableByKey(job.key);
      logger.debug({ jobKey: job.key }, 'Removed existing retention job');
    }

    // Add new retention job with cron schedule
    await retentionQueue.add(
      'retention',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // Daily at 2am UTC
        },
        jobId: 'retention-daily',
        removeOnComplete: 10,
        removeOnFail: 5,
      }
    );

    logger.info({ schedule: '0 2 * * *' }, 'Retention cron job registered');
  } catch (error) {
    logger.error({ err: error }, 'Error registering retention job');
    throw error;
  }
}

/**
 * Start health check HTTP server
 * Provides a health endpoint for monitoring worker status
 */
async function startHealthServer(): Promise<void> {
  const port = 3001;

  healthServer = http.createServer(async (req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        // Check Redis connection
        await redis.ping();

        // Get queue stats
        const [pingCounts, incidentCounts, notificationCounts, retentionCounts] =
          await Promise.all([
            pingQueue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
            (await import('../queues/index.js')).incidentQueue.getJobCounts(
              'waiting',
              'active',
              'failed'
            ),
            (await import('../queues/index.js')).notificationQueue.getJobCounts(
              'waiting',
              'active',
              'failed'
            ),
            retentionQueue.getJobCounts('waiting', 'active', 'failed'),
          ]);

        const response = {
          status: 'ok',
          timestamp: new Date().toISOString(),
          database: 'connected',
          redis: 'connected',
          workers: {
            ping: { active: workers[0]?.isRunning() || false },
            incident: { active: workers[1]?.isRunning() || false },
            notification: { active: workers[2]?.isRunning() || false },
            retention: { active: workers[3]?.isRunning() || false },
          },
          queues: {
            ping: pingCounts,
            incident: incidentCounts,
            notification: notificationCounts,
            retention: retentionCounts,
          },
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
      } catch (error) {
        logger.error({ err: error }, 'Health check failed');

        const response = {
          status: 'degraded',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response, null, 2));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  healthServer.listen(port, () => {
    logger.info({ port }, 'Health check server listening');
  });
}

/**
 * Graceful shutdown
 * Closes all workers and connections cleanly
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

  try {
    // Close health server
    if (healthServer) {
      await new Promise<void>((resolve) => {
        healthServer!.close(() => {
          logger.info('Health check server closed');
          resolve();
        });
      });
    }

    // Close all workers
    logger.info({ workerCount: workers.length }, 'Closing workers');

    await Promise.all(
      workers.map(async (worker, index) => {
        try {
          await worker.close();
          logger.info({ workerIndex: index }, 'Worker closed');
        } catch (error) {
          logger.error({ err: error, workerIndex: index }, 'Error closing worker');
        }
      })
    );

    // Disconnect from database
    await disconnectDatabase();

    // Disconnect from Redis
    await disconnectRedis();

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

// Main startup function
async function main(): Promise<void> {
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      pingConcurrency: env.PING_WORKER_CONCURRENCY,
      retentionDays: env.PING_LOG_RETENTION_DAYS,
    },
    'Starting StatusPing worker process'
  );

  try {
    
    // Step 1: Connect to services 
    logger.info('Connecting to services');

    // Test database connection
    await connectDatabase();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');

    // Connect to Redis
    await connectRedis();
    await redis.ping();
    logger.info('Redis connection verified');

    // Step 2: Re-register monitor jobs
    await reRegisterMonitorJobs();

    // Step 3: Register retention cron job
    await registerRetentionJob();
    
    // Step 4: Create and start workers
    logger.info('Creating workers');

    workers.push(createPingWorker());
    workers.push(createIncidentWorker());
    workers.push(createNotificationWorker());
    workers.push(createRetentionWorker());

    logger.info({ workerCount: workers.length }, 'All workers created and started');

    
    // Step 5: Start health check server
    await startHealthServer();

    // Step 6: Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.fatal({ err: error }, 'Uncaught exception');
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled rejection');
      gracefulShutdown('unhandledRejection');
    });

    logger.info('✅ StatusPing worker process started successfully');
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start worker process');
    process.exit(1);
  }
}

// Start the worker process
main();