/**
 * Custom error classes for consistent error handling
 * These errors are used by the centralized error handler middleware
 */

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  /**
   * @param statusCode - HTTP status code
   * @param code - Application-specific error code
   * @param message - Human-readable error message
   * @param details - Optional additional error details
   */
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(401, 'UNAUTHORIZED', message, details);
  }
}

/**
 * 403 Forbidden - Authenticated but not authorized
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: unknown) {
    super(403, 'FORBIDDEN', message, details);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: unknown) {
    super(404, 'NOT_FOUND', message, details);
  }
}

/**
 * 409 Conflict - Resource already exists or state conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

/**
 * 422 Unprocessable Entity - Semantically invalid request
 */
export class UnprocessableError extends AppError {
  constructor(message: string = 'Unprocessable entity', details?: unknown) {
    super(422, 'UNPROCESSABLE', message, details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', details?: unknown) {
    super(429, 'RATE_LIMITED', message, details);
  }
}

/**
 * 500 Internal Server Error - Unexpected errors
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: unknown) {
    super(500, 'INTERNAL_ERROR', message, details);
  }
}