import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter, globalRateLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/auth.routes.js';
import monitorsRoutes from './routes/monitors.routes.js';
import pingLogsRoutes from './routes/ping-logs.routes.js';
import incidentsRoutes from './routes/incidents.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import statusRoutes from './routes/status.routes.js';
import healthRoutes from './routes/health.routes.js';
import aiInsightsRoutes from './routes/ai-insights.routes.js';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '10kb' }));

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = ['http://localhost:5173', 'http://localhost:3000', env.APP_URL];
        callback(null, allowed.includes(origin) || origin.endsWith('.vercel.app'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  app.use(globalRateLimiter);

  app.use('/api/health', healthRoutes);
  app.use('/api/status', statusRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, monitorsRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, pingLogsRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, incidentsRoutes);
  app.use('/api/monitors', authMiddleware, rateLimiter, notificationsRoutes);
  app.use('/api/incidents', authMiddleware, rateLimiter, incidentsRoutes);
  app.use('/api/ai-insights', authMiddleware, rateLimiter, aiInsightsRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
