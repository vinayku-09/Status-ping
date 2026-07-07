import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import { redis } from '../../config/redis.js';
import { createLogger } from '../../lib/logger.js';

const router = Router();
const logger = createLogger('api', 'health-routes');

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let postgresStatus = 'disconnected';
    let redisStatus = 'disconnected';
    let isHealthy = true;

    // Check PostgreSQL
    try {
      await prisma.$queryRaw`SELECT 1`;
      postgresStatus = 'connected';
      logger.debug('PostgreSQL health check passed');
    } catch (error) {
      isHealthy = false;
      logger.error({ err: error }, 'PostgreSQL health check failed');
    }

    // Check Redis
    try {
      const result = await redis.ping();
      if (result === 'PONG') {
        redisStatus = 'connected';
        logger.debug('Redis health check passed');
      } else {
        isHealthy = false;
        logger.warn({ result }, 'Redis ping returned unexpected result');
      }
    } catch (error) {
      isHealthy = false;
      logger.error({ err: error }, 'Redis health check failed');
    }

    const response = {
      status: isHealthy ? 'ok' : 'degraded',
      postgres: postgresStatus,
      redis: redisStatus,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };

    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    logger.error({ err: error }, 'Health check error');

    const response = {
      status: 'error',
      postgres: 'unknown',
      redis: 'unknown',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    res.status(503).json(response);
  }
});

export default router;