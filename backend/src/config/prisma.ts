/**
 * Prisma client singleton
 * Provides a single Prisma client instance with query logging
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('api', 'prisma');

/**
 * Singleton Prisma client instance with query logging
 */
export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

// Log slow queries (> 500ms) at WARN level
prisma.$on('query' as never, (e: { query: string; params: string; duration: number; target: string }) => {
  if (e.duration > 500) {
    logger.warn(
      {
        query: e.query,
        params: e.params,
        duration: e.duration,
        target: e.target,
      },
      'Slow query detected'
    );
  }
});

// Log warnings
prisma.$on('warn' as never, (e: { message: string; target: string }) => {
  logger.warn({ message: e.message, target: e.target }, 'Prisma warning');
});

// Log errors
prisma.$on('error' as never, (e: { message: string; target: string }) => {
  logger.error({ message: e.message, target: e.target }, 'Prisma error');
});

/**
 * Connect to database and verify connection
 * @returns Promise that resolves when connected
 * @throws Error if connection fails
 */
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Gracefully disconnect from database
 * @returns Promise that resolves when disconnected
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error during database disconnect');
    throw error;
  }
}