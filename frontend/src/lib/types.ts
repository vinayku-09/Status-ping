// ========================
// Enums
// ========================

export type MonitorStatus = 'pending' | 'active' | 'degraded' | 'down' | 'paused';
export type IncidentStatus = 'open' | 'resolved';
export type NotificationType = 'email' | 'webhook';
export type NotificationEventType = 'opened' | 'resolved';
export type NotificationDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'suppressed';
export type PingErrorType =
  | 'TIMEOUT'
  | 'DNS_FAILURE'
  | 'CONNECTION_REFUSED'
  | 'SSL_ERROR'
  | 'REDIRECT_LIMIT'
  | 'HTTP_ERROR';
export type OverallStatus = 'operational' | 'degraded' | 'outage';
export type CheckInterval = 1 | 5 | 15 | 30 | 60;

// ========================
// API Response Wrappers
// ========================

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ========================
// Auth
// ========================

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

// ========================
// Monitor
// ========================

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  url: string;
  checkIntervalMinutes: number;
  failureThreshold: number;
  timeoutSeconds: number;
  keywordCheck: string | null;
  status: MonitorStatus;
  consecutiveFailures: number;
  lastCheckedAt: string | null;
  statusPageVisible: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorListItem extends Monitor {
  uptimePercent30d: number | null;
}

export interface CreateMonitorBody {
  name: string;
  url: string;
  checkIntervalMinutes: CheckInterval;
  failureThreshold?: number;
  timeoutSeconds?: number;
  keywordCheck?: string;
  statusPageVisible?: boolean;
}

export interface UpdateMonitorBody {
  name?: string;
  url?: string;
  checkIntervalMinutes?: CheckInterval;
  failureThreshold?: number;
  timeoutSeconds?: number;
  keywordCheck?: string;
  statusPageVisible?: boolean;
  status?: 'active' | 'paused';
}

export interface ListMonitorsParams {
  status?: MonitorStatus;
  page?: number;
  limit?: number;
  sort?: 'createdAt' | 'name' | 'status' | 'lastCheckedAt';
  order?: 'asc' | 'desc';
}

// ========================
// Monitor Detail
// ========================

export interface MonitorDetail {
  monitor: Monitor;
  pingLogs: PingLog[];
  openIncident: Incident | null;
  latestSslCheck: SslCheck | null;
  stats: {
    uptimePercent30d: number | null;
    p95ResponseTimeMs: number | null;
  };
}

// ========================
// Ping Logs
// ========================

export interface PingLog {
  id: number;
  monitorId: string;
  checkedAt: string;
  isUp: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: PingErrorType | null;
  redirectCount: number;
  finalUrl: string | null;
}

export interface ListPingLogsParams {
  from?: string;
  to?: string;
  limit?: number;
  isUp?: boolean;
}

// ========================
// Daily Stats / Response Times
// ========================

export interface DailyStat {
  statDate: string;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  uptimePercent: number | null;
}

export interface ResponseTimesParams {
  days?: number;
}

// ========================
// Incidents
// ========================

export interface Incident {
  id: string;
  monitorId: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number | null;
  rootCause: string | null;
  errorType: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListIncidentsParams {
  status?: IncidentStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateIncidentBody {
  rootCause?: string;
}

// ========================
// Notifications
// ========================

export interface NotificationConfig {
  id: string;
  monitorId: string;
  userId: string;
  type: NotificationType;
  email: string | null;
  webhookUrl: string | null;
  onIncidentOpen: boolean;
  onIncidentResolve: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailNotificationBody {
  type: 'email';
  email: string;
  onIncidentOpen?: boolean;
  onIncidentResolve?: boolean;
}

export interface CreateWebhookNotificationBody {
  type: 'webhook';
  webhookUrl: string;
  onIncidentOpen?: boolean;
  onIncidentResolve?: boolean;
}

export type CreateNotificationBody =
  | CreateEmailNotificationBody
  | CreateWebhookNotificationBody;

// ========================
// SSL Check
// ========================

export interface SslCheck {
  id: number;
  monitorId: string;
  checkedAt: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  issuer: string | null;
  isValid: boolean;
  errorMessage: string | null;
}

// ========================
// Public Status Page
// ========================

export interface StatusMonitor {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  uptime90d: Array<{
    date: string;
    uptimePercent: number | null;
  }>;
}

export interface ActiveIncident {
  id: string;
  startedAt: string;
  errorType: string | null;
  monitor: {
    id: string;
    name: string;
  };
}

export interface StatusPageData {
  overallStatus: OverallStatus;
  monitors: StatusMonitor[];
  activeIncidents: ActiveIncident[];
}

// ========================
// Health
// ========================

// ========================
// AI Insights (dummy)
// ========================

export type AiInsightSeverity = 'info' | 'warning' | 'critical';
export type AiInsightCategory = 'performance' | 'reliability' | 'security' | 'optimization';

export interface AiInsight {
  id: string;
  title: string;
  description: string;
  severity: AiInsightSeverity;
  category: AiInsightCategory;
  monitorName: string | null;
  suggestedAction: string;
  confidence: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  postgres: string;
  redis: string;
  version: string;
  timestamp: string;
  error?: string;
}
