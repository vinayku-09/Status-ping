/**
 * Shared TypeScript types and interfaces
 */

import { Request } from 'express';

/**
 * Authenticated user payload from JWT
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Standard API error response
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * JWT token payload
 */
export interface JwtPayload {
  sub: string; // user ID
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Monitor status enum values
 */
export type MonitorStatus = 'pending' | 'active' | 'degraded' | 'down' | 'paused';

/**
 * Incident status enum values
 */
export type IncidentStatus = 'open' | 'resolved';

/**
 * Notification type enum values
 */
export type NotificationType = 'email' | 'webhook';

/**
 * Notification event type enum values
 */
export type NotificationEventType = 'opened' | 'resolved';

/**
 * Notification delivery status enum values
 */
export type NotificationDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'suppressed';

/**
 * Error type enum values for ping failures
 */
export type PingErrorType =
  | 'TIMEOUT'
  | 'DNS_FAILURE'
  | 'CONNECTION_REFUSED'
  | 'SSL_ERROR'
  | 'REDIRECT_LIMIT'
  | 'HTTP_ERROR';