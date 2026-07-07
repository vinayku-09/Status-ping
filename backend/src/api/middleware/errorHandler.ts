/**
 * Centralized error handler middleware
 * Catches all errors and returns consistent JSON responses
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../../lib/errors.js';
import { ApiError } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';
import { env } from '../../config/env.js';


const logger = createLogger('api', 'error-handler');

/**
 * Centralized error handling middleware
 * Must have 4 parameters to be recognized as error handler by Express
 * 
 * @param err - Error object
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle custom application errors
  if (err instanceof AppError) {
    logger.warn(
      {
        code: err.code,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
      },
      err.message
    );

    const response: ApiError = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
        errors: err.errors,
      },
      'Validation error'
    );

    const response: ApiError = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.format(),
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(
      {
        code: err.code,
        path: req.path,
        method: req.method,
        meta: err.meta,
      },
      'Prisma error'
    );

    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const response: ApiError = {
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
          details: err.meta,
        },
      };

      res.status(409).json(response);
      return;
    }

    // P2025: Record not found
    if (err.code === 'P2025') {
      const response: ApiError = {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
      };

      res.status(404).json(response);
      return;
    }

    // P2003: Foreign key constraint violation
    if (err.code === 'P2003') {
      const response: ApiError = {
        error: {
          code: 'UNPROCESSABLE',
          message: 'Related resource not found',
          details: err.meta,
        },
      };

      res.status(422).json(response);
      return;
    }

    // Other Prisma errors
    const response: ApiError = {
      error: {
        code: 'DATABASE_ERROR',
        message: 'Database operation failed',
      },
    };

    res.status(500).json(response);
    return;
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn(
      {
        path: req.path,
        method: req.method,
      },
      'Prisma validation error'
    );

    const response: ApiError = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle unknown errors
  logger.error(
    {
      err,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    },
    'Unhandled error'
  );

  const response: ApiError = {
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' 
        ? 'Something went wrong' 
        : err instanceof Error 
          ? err.message 
          : 'Unknown error',
    },
  };

  res.status(500).json(response);
}