/**
 * Redis client singleton
 * Provides a single Redis connection instance shared across the application
 */

import Redis from 'ioredis';
import { env } from './env.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('api', 'redis');

/**
 * Singleton Redis client instance
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    logger.warn({ times, delay }, 'Redis connection retry');
    return delay;
  },
});

// Connection event handlers
redis.on('connect', () => {
  logger.info('Redis connection established');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error: Error) => {
  logger.error({ err: error }, 'Redis connection error');
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', (delay: number) => {
  logger.info({ delay }, 'Redis reconnecting');
});

redis.on('end', () => {
  logger.warn('Redis connection ended');
});

/**
 * Connect to Redis and wait until the connection is ready
 * @returns Promise that resolves when Redis is connected
 * @throws Error if connection fails
 */
export async function connectRedis(): Promise<void> {
  try {
    if (redis.status === 'ready') {
      logger.info('Redis already connected');
      return;
    }

    if (redis.status === 'connecting' || redis.status === 'connect' || redis.status === 'reconnecting') {
      await waitForRedisReady();
      logger.info('Redis connected successfully');
      return;
    }

    await redis.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to Redis');
    throw error;
  }
}

function waitForRedisReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      redis.off('ready', handleReady);
      redis.off('error', handleError);
      redis.off('end', handleEnd);
    };

    const handleReady = () => {
      cleanup();
      resolve();
    };

    const handleError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const handleEnd = () => {
      cleanup();
      reject(new Error('Redis connection ended before becoming ready'));
    };

    redis.once('ready', handleReady);
    redis.once('error', handleError);
    redis.once('end', handleEnd);
  });
}

/**
 * Gracefully disconnect from Redis
 * @returns Promise that resolves when disconnected
 */
export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
    logger.info('Redis disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error during Redis disconnect');
    throw error;
  }
}
