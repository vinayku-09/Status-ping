import express, { Request, Response } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/prisma.js';
import { connectRedis, disconnectRedis } from '../config/redis.js';
import { logger } from '../lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter, globalRateLimiter } from './middleware/rateLimiter.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import monitorsRoutes from './routes/monitors.routes.js';
import pingLogsRoutes from './routes/ping-logs.routes.js';
import incidentsRoutes from './routes/incidents.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import statusRoutes from './routes/status.routes.js';
import healthRoutes from './routes/health.routes.js';
import aiInsightsRoutes from './routes/ai-insights.routes.js';

// Create and configure Express application
function createApp() {
  const app = express();

    // Middleware (order matters!)
  
  // 1. JSON body parser with size limit
  app.use(express.json({ limit: '10kb' }));


  // 2. CORS
app.use(
  cors({
    origin: [
      'http://localhost:5173',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

  // 2. Request logging with Pino
  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/health', // Don't log health checks
      },
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  // 3. Global rate limiter for all routes (IP-based)
  app.use(globalRateLimiter);

    // Routes
  
  // Health check (no auth, no user rate limit)
  app.use('/api/health', healthRoutes);

  // Public status page (no auth, no user rate limit)
  app.use('/api/status', statusRoutes);

  // Auth routes (no auth middleware, but has global rate limit)
  app.use('/api/auth', authRoutes);

  // Protected monitor routes (auth + user rate limit)
  app.use('/api/monitors', authMiddleware, rateLimiter, monitorsRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, pingLogsRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, incidentsRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, notificationsRoutes);

  // Protected incident routes (auth + user rate limit)
  app.use('/api/incidents', authMiddleware, rateLimiter, incidentsRoutes);

  // Protected AI insights (auth + user rate limit)
  app.use('/api/ai-insights', authMiddleware, rateLimiter, aiInsightsRoutes);

    // Error Handlers
  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}

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