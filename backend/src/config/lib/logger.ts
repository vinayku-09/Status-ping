/**
 * Pino logger factory and instances
 * Provides structured logging for API and worker processes
 */

import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Create a Pino logger instance with service and component context
 * @param service - The service name ('api' or 'worker')
 * @param component - Optional component name for additional context
 * @returns Configured Pino logger instance
 */
export function createLogger(service: 'api' | 'worker', component?: string) {
  return pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    base: {
      service,
      component: component || undefined,
      env: env.NODE_ENV,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
  });
}

/**
 * Default logger instance for the API service
 */
export const logger = createLogger('api');

/**
 * Logger instance for the worker service
 */
export const workerLogger = createLogger('worker');