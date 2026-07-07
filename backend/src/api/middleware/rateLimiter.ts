import { Request, Response, NextFunction } from 'express';
import { redis } from '../../config/redis.js';
import { RateLimitError } from '../../lib/errors.js';
import { createLogger } from '../../lib/logger.js';

const logger = createLogger('api', 'rate-limiter');

// Rate limit configuration
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // 100 requests per minute per user

export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authReq = req as any;
    const userId = authReq.user?.id;

    if (!userId) {
      // If no user (shouldn't happen on authenticated routes), skip
      return next();
    }

    const key = `ratelimit:${userId}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Use Redis transaction for atomic operations
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zremrangebyscore(key, '-inf', windowStart);

    // Add current request
    multi.zadd(key, now, `${now}`);

    // Count requests in current window
    multi.zcard(key);

    // Set expiry on the key
    multi.expire(key, Math.ceil(WINDOW_MS / 1000));

    const results = await multi.exec();

    if (!results) {
      logger.error({ userId }, 'Redis transaction failed for rate limiting');
      // If Redis fails, allow the request (fail open)
      return next();
    }

    // Extract count from results
    const count = results[2][1] as number;

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(now + WINDOW_MS).toISOString());

    if (count > MAX_REQUESTS) {
      const retryAfter = Math.ceil(WINDOW_MS / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      logger.warn(
        { userId, count, limit: MAX_REQUESTS },
        'Rate limit exceeded'
      );

      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${MAX_REQUESTS} requests per minute.`
      );
    }

    logger.debug({ userId, count, limit: MAX_REQUESTS }, 'Rate limit check passed');

    next();
  } catch (error) {
    next(error);
  }
}

export async function globalRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:ip:${ip}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    const globalMaxRequests = 200; // Higher limit for IP-based

    const multi = redis.multi();
    multi.zremrangebyscore(key, '-inf', windowStart);
    multi.zadd(key, now, `${now}`);
    multi.zcard(key);
    multi.expire(key, Math.ceil(WINDOW_MS / 1000));

    const results = await multi.exec();

    if (!results) {
      // Fail open if Redis is unavailable
      return next();
    }

    const count = results[2][1] as number;

    res.setHeader('X-RateLimit-Limit', globalMaxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, globalMaxRequests - count).toString());

    if (count > globalMaxRequests) {
      const retryAfter = Math.ceil(WINDOW_MS / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      logger.warn({ ip, count, limit: globalMaxRequests }, 'Global rate limit exceeded');

      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${globalMaxRequests} requests per minute.`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}