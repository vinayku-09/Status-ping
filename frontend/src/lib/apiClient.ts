import {
  AuthResponse,
  LoginBody,
  RegisterBody,
  User,
  CreateMonitorBody,
  UpdateMonitorBody,
  ListMonitorsParams,
  MonitorListItem,
  MonitorDetail,
  ListPingLogsParams,
  PingLog,
  ResponseTimesParams,
  DailyStat,
  ListIncidentsParams,
  Incident,
  UpdateIncidentBody,
  NotificationConfig,
  CreateNotificationBody,
  StatusPageData,
  HealthResponse,
  AiInsight,
  ApiResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClientError extends Error {
  constructor(public status: number, public data: unknown) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ||
      'An API error occurred';
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null as unknown as T;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiClientError(response.status, data);
    }

    return data;
  }

  private buildQueryString(params?: object): string {
    if (!params) return '';
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params) as [string, unknown][]) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }

  // Auth
  async login(body: LoginBody): Promise<ApiResponse<AuthResponse>> {
    return this.fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });
  }

  async register(body: RegisterBody): Promise<ApiResponse<AuthResponse>> {
    return this.fetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
  }

  async getMe(): Promise<ApiResponse<User>> {
    return this.fetch('/api/auth/me');
  }

  // Monitors
  async getMonitors(params?: ListMonitorsParams): Promise<ApiResponse<MonitorListItem[]>> {
    return this.fetch(`/api/monitors${this.buildQueryString(params)}`);
  }

  async createMonitor(body: CreateMonitorBody): Promise<ApiResponse<MonitorListItem>> {
    return this.fetch('/api/monitors', { method: 'POST', body: JSON.stringify(body) });
  }

  async getMonitor(id: string): Promise<ApiResponse<MonitorDetail>> {
    return this.fetch(`/api/monitors/${id}`);
  }

  async updateMonitor(id: string, body: UpdateMonitorBody): Promise<ApiResponse<MonitorListItem>> {
    return this.fetch(`/api/monitors/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async deleteMonitor(id: string, force?: boolean): Promise<void> {
    return this.fetch(`/api/monitors/${id}${this.buildQueryString({ force })}`, { method: 'DELETE' });
  }

  // Ping Logs
  async getPingLogs(monitorId: string, params?: ListPingLogsParams): Promise<ApiResponse<PingLog[]>> {
    return this.fetch(`/api/monitors/${monitorId}/ping-logs${this.buildQueryString(params)}`);
  }

  async getResponseTimes(monitorId: string, params?: ResponseTimesParams): Promise<ApiResponse<DailyStat[]>> {
    return this.fetch(`/api/monitors/${monitorId}/response-times${this.buildQueryString(params)}`);
  }

  // Incidents
  async getIncidents(monitorId: string, params?: ListIncidentsParams): Promise<ApiResponse<Incident[]>> {
    return this.fetch(`/api/monitors/${monitorId}/incidents${this.buildQueryString(params)}`);
  }

  async updateIncident(id: string, body: UpdateIncidentBody): Promise<ApiResponse<Incident>> {
    return this.fetch(`/api/incidents/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  // Notifications
  async getNotifications(monitorId: string): Promise<ApiResponse<NotificationConfig[]>> {
    return this.fetch(`/api/monitors/${monitorId}/notifications`);
  }

  async createNotification(monitorId: string, body: CreateNotificationBody): Promise<ApiResponse<NotificationConfig>> {
    return this.fetch(`/api/monitors/${monitorId}/notifications`, { method: 'POST', body: JSON.stringify(body) });
  }

  async deleteNotification(monitorId: string, configId: string): Promise<void> {
    return this.fetch(`/api/monitors/${monitorId}/notifications/${configId}`, { method: 'DELETE' });
  }

  // Public
  async getStatusPage(): Promise<ApiResponse<StatusPageData>> {
    return this.fetch('/api/status');
  }

  async getHealth(): Promise<HealthResponse> {
    try {
      return await this.fetch('/api/health');
    } catch (error) {
      if (error instanceof ApiClientError && error.data) {
        return error.data as HealthResponse; // The health endpoint returns JSON even on 503
      }
      throw error;
    }
  }

  // AI Insights (dummy)
  async getAiInsights(): Promise<ApiResponse<AiInsight[]>> {
    return this.fetch('/api/ai-insights');
  }
}

export const api = new ApiClient();
