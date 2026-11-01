import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/prisma.js';
import { connectRedis, disconnectRedis } from '../config/redis.js';
import { logger } from '../lib/logger.js';
import { createApp } from './app.js';

/**
 * Start the server
 */
async function startServer() {
  logger.info(
    {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      appUrl: env.APP_URL,
    },
    'Starting StatusPing API server'
  );

  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, '✅ StatusPing API server started successfully');
      logger.info(`Server listening at ${env.APP_URL}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown');

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await disconnectDatabase();
          await disconnectRedis();
          logger.info('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error({ err: error }, 'Error during shutdown');
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.fatal({ err: error }, 'Uncaught exception');
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.fatal({ reason }, 'Unhandled rejection');
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();
