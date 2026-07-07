/**
 * JWT authentication middleware
 * Verifies JWT tokens and attaches user information to the request
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { AuthUser, JwtPayload } from '../../types/index.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('api', 'auth-middleware');

/**
 * Extract JWT token from Authorization header
 * @param req - Express request object
 * @returns JWT token string or null
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 * 
 * @throws {UnauthorizedError} If token is missing, invalid, or expired
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    // Verify the token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      throw error;
    }

    // Attach user information to request
    const user: AuthUser = {
      id: decoded.sub,
      email: decoded.email,
    };

    (req as any).user = user;

    logger.debug({ userId: user.id, email: user.email }, 'User authenticated');

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if missing
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      
      const user: AuthUser = {
        id: decoded.sub,
        email: decoded.email,
      };

      (req as any).user = user;
    } catch (error) {
      // Invalid token, but don't fail - just proceed without user
      logger.debug({ err: error }, 'Optional auth: invalid token ignored');
    }

    next();
  } catch (error) {
    next(error);
  }
}