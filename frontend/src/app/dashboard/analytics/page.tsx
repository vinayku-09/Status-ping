'use client';

import { useEffect, useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from '@/lib/apiClient';
import { MonitorListItem, DailyStat, PingLog } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

const tooltipStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
  fontSize: '12px',
  boxShadow: 'var(--shadow-md)',
};

const axisStyle = {
  fontSize: 11,
  fill: 'var(--color-text-tertiary)',
};

function uptimeColor(pct: number | null): string {
  if (pct === null) return 'var(--color-border)';
  if (pct >= 99.9) return 'var(--color-up)';
  if (pct >= 99) return '#63C87C';
  if (pct >= 95) return 'var(--color-degraded)';
  return 'var(--color-down)';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AnalyticsPage() {
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [pingLogs, setPingLogs] = useState<PingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMonitors = async () => {
      try {
        const res = await api.getMonitors({ limit: 100 });
        setMonitors(res.data);
        if (res.data.length > 0) setSelectedId(res.data[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load monitors');
      }
    };
    loadMonitors();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [rtRes, logsRes] = await Promise.all([
          api.getResponseTimes(selectedId, { days }),
          api.getPingLogs(selectedId, { limit: 100 }),
        ]);
        setStats(rtRes.data);
        setPingLogs(logsRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selectedId, days]);

  const { avgUptime, avgP95, totalChecks, upChecks } = useMemo(() => {
    if (stats.length === 0) return { avgUptime: 0, avgP95: 0, totalChecks: 0, upChecks: 0 };
    const valid = stats.filter((s) => s.uptimePercent !== null);
    const avgUptime = valid.length
      ? valid.reduce((a, s) => a + (s.uptimePercent || 0), 0) / valid.length
      : 0;
    const p95s = stats.filter((s) => s.p95Ms !== null).map((s) => s.p95Ms as number);
    const avgP95 = p95s.length ? p95s.reduce((a, b) => a + b, 0) / p95s.length : 0;
    const up = pingLogs.filter((l) => l.isUp).length;
    return {
      avgUptime: Number(avgUptime.toFixed(2)),
      avgP95: Math.round(avgP95),
      totalChecks: pingLogs.length,
      upChecks: up,
    };
  }, [stats, pingLogs]);

  if (error && monitors.length === 0) {
    return <div className="text-center py-12 text-[var(--color-down)]">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">Analytics</h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-1">
            Response times & uptime from <code className="text-[var(--color-brand)]">/api/monitors/:id/response-times</code> and{' '}
            <code className="text-[var(--color-brand)]">/ping-logs</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-body-sm text-[var(--color-text-primary)] focus:border-[var(--color-brand)] focus:outline-none"
          >
            {monitors.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
        </div>
      </div>

      {monitors.length === 0 ? (
        <Card className="p-12 text-center text-[var(--color-text-secondary)]">
          No monitors available to analyze.
        </Card>
      ) : isLoading ? (
        <div className="text-center py-12 text-[var(--color-text-secondary)]">Loading analytics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label={`Avg Uptime (${days}d)`} value={`${avgUptime}%`} trend={avgUptime > 99 ? 'up' : 'down'} />
            <KPICard label="Avg P95 Latency" value={`${avgP95}ms`} />
            <KPICard label="Total Checks" value={totalChecks} />
            <KPICard
              label="Successful"
              value={totalChecks ? `${Math.round((upChecks / totalChecks) * 100)}%` : '—'}
              trend={upChecks / (totalChecks || 1) > 0.99 ? 'up' : 'down'}
            />
          </div>

          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-md text-[var(--color-text-primary)]">Response Time (ms)</h2>
              <div className="flex items-center gap-4 text-caption text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--color-up)]" />p50</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--color-chart-1)]" />p95</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[var(--color-chart-4)]" />p99</span>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-p50" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-up)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-up)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-p95" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-p99" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="statDate"
                    tickFormatter={formatDate}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    minTickGap={24}
                  />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={48} unit="ms" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}
                    formatter={(value, name) => [`${value} ms`, String(name).toUpperCase()]}
                  />
                  <Area type="monotone" dataKey="p50Ms" name="p50" stroke="var(--color-up)" strokeWidth={2} fill="url(#grad-p50)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="p95Ms" name="p95" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#grad-p95)" isAnimationActive={false} />
                  <Area type="monotone" dataKey="p99Ms" name="p99" stroke="var(--color-chart-4)" strokeWidth={2} fill="url(#grad-p99)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-caption text-[var(--color-text-tertiary)]">
              <span>{days} days ago</span>
              <span>Today</span>
            </div>
          </Card>

          <Card className="p-6 flex flex-col gap-4">
            <h2 className="text-title-md text-[var(--color-text-primary)]">Daily Uptime %</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="statDate"
                    tickFormatter={formatDate}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[90, 100]}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-surface-raised)' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}
                    formatter={(value) => [`${value}%`, 'Uptime']}
                  />
                  <Bar dataKey="uptimePercent" name="Uptime" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {stats.map((d, i) => (
                      <Cell key={i} fill={uptimeColor(d.uptimePercent)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-caption text-[var(--color-text-tertiary)]">
              <span>{days} days ago</span>
              <span>Today</span>
            </div>
          </Card>

          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-md text-[var(--color-text-primary)]">Recent Checks</h2>
              <StatusBadge status={totalChecks ? (upChecks / totalChecks > 0.99 ? 'active' : 'degraded') : 'paused'} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {pingLogs.slice(0, 18).map((log) => (
                <div
                  key={log.id}
                  className="rounded-[var(--radius-md)] px-3 py-2 text-caption border border-[var(--color-border)]"
                  title={`${new Date(log.checkedAt).toLocaleString()}\n${log.isUp ? 'OK' : 'FAIL'} ${log.statusCode || ''} ${log.responseTimeMs ? log.responseTimeMs + 'ms' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${log.isUp ? 'bg-[var(--color-up)]' : 'bg-[var(--color-down)]'}`} />
                    <span className="text-[var(--color-text-secondary)]">
                      {log.responseTimeMs ? `${log.responseTimeMs}ms` : log.errorType || '—'}
                    </span>
                  </div>
                </div>
              ))}
              {pingLogs.length === 0 && (
                <span className="text-caption text-[var(--color-text-tertiary)] col-span-full">
                  No ping logs available.
                </span>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
