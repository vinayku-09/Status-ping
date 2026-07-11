'use client';

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Legend,
} from "recharts";
import { RefreshCw, Search } from "lucide-react";
import { api } from '@/lib/apiClient';
import { MonitorListItem, DailyStat, PingLog } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { KPICard } from '@/components/ui/KPICard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

// Clean Light-Mode Styling Configuration for Recharts Look & Feel
const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  color: '#0f172a',
  fontSize: '12px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
};

const axisStyle = {
  fontSize: 11,
  fill: '#64748b',
  fontWeight: 500,
};

function uptimeColor(pct: number | null): string {
  if (pct === null) return '#e2e8f0';
  if (pct >= 99.9) return '#10b981'; // Vibrant Green
  if (pct >= 99) return '#34d399';
  if (pct >= 95) return '#f59e0b'; // Degraded Amber
  return '#ef4444'; // Down Red
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
  const [monitorSearch, setMonitorSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load all available monitors
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

  // Filter monitors dynamically via search string
  const filteredMonitors = useMemo(() => {
    return monitors.filter(m => 
      m.name.toLowerCase().includes(monitorSearch.toLowerCase())
    );
  }, [monitors, monitorSearch]);

  // Derive a valid selection: fall back to the first filtered monitor when the
  // current selection is no longer present in the filtered list.
  const effectiveSelectedId = useMemo(
    () => (filteredMonitors.some(m => m.id === selectedId) ? selectedId : (filteredMonitors[0]?.id ?? '')),
    [filteredMonitors, selectedId]
  );

  // Core data load action for metrics and logs
  const loadAnalyticsData = useCallback(async (showLoadingIndicator = true) => {
    if (!effectiveSelectedId) return;
    const id = effectiveSelectedId;
    if (showLoadingIndicator) setIsLoading(true);
    setError('');
    try {
      const [rtRes, logsRes] = await Promise.all([
        api.getResponseTimes(id, { days }),
        api.getPingLogs(id, { limit: 100 }),
      ]);
      setStats(rtRes.data);
      setPingLogs(logsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [effectiveSelectedId, days]);

  // Load telemetry whenever the selected monitor or range changes.
  // Deferred to a microtask so state updates occur outside the effect body.
  useEffect(() => {
    if (!effectiveSelectedId) return;
    void Promise.resolve().then(() => loadAnalyticsData(true));
  }, [loadAnalyticsData, effectiveSelectedId]);

  // Manual explicit refresh command action
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadAnalyticsData(false);
  };

  // Compute operational overview summaries
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
    return <div className="text-center py-12 text-rose-600 font-semibold bg-white rounded-xl border border-slate-200">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full text-slate-900 bg-transparent">
      
      {/* Dashboard Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Real-time status analysis engine and latency telemetry graphs.
          </p>
        </div>
      </div>

      {/* 4. Unified Filter & Command Control Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        
        {/* Left Side: Monitor Selection Search Suite */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
          {/* Real-time Search Box Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search monitors..."
              value={monitorSearch}
              onChange={(e) => setMonitorSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm font-medium bg-slate-50 text-slate-900 rounded-xl border border-slate-200 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Targeted Monitor Selector Match Dropdown */}
          <select
            value={effectiveSelectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="sm:w-64 px-3 py-2 text-sm font-semibold bg-white text-slate-900 rounded-xl border border-slate-200 shadow-xs focus:border-blue-500 focus:outline-none transition-colors"
          >
            {filteredMonitors.length === 0 ? (
              <option value="">No matching monitors</option>
            ) : (
              filteredMonitors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Right Side: Range Actions & Quick Refreshes */}
        <div className="flex items-center justify-end gap-3 self-end lg:self-auto">
          {/* Consolidated Filter Windows */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  days === d 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Manual Console Sync Frame */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing || !effectiveSelectedId}
            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 rounded-xl px-3 flex items-center gap-1.5 h-9 font-semibold text-xs shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Core Analytics Blocks */}
      {monitors.length === 0 ? (
        <Card className="p-12 text-center text-slate-500 font-medium bg-white border-slate-200">
          No monitors available to analyze.
        </Card>
      ) : isLoading ? (
        <div className="text-center py-24 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw className="h-6 w-6 text-blue-500 animate-spin mx-auto mb-2" />
          Fetching Telemetry Metrics...
        </div>
      ) : (
        <>
          {/* Key Metric Indicator Summaries Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label={`Avg Uptime (${days}d)`} value={`${avgUptime}%`} trend={avgUptime > 99 ? 'up' : 'down'} className="bg-white border-slate-200 text-slate-900" />
            <KPICard label="Avg P95 Latency" value={`${avgP95}ms`} className="bg-white border-slate-200 text-slate-900" />
            <KPICard label="Total Checks" value={totalChecks} className="bg-white border-slate-200 text-slate-900" />
            <KPICard
              label="Successful Operations"
              value={totalChecks ? `${Math.round((upChecks / totalChecks) * 100)}%` : '—'}
              trend={upChecks / (totalChecks || 1) > 0.99 ? 'up' : 'down'}
              className="bg-white border-slate-200 text-slate-900"
            />
          </div>

          {/* Response Time (ms) - Area Chart Platform */}
          <Card className="p-6 flex flex-col gap-4 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Response Time Performance (ms)</h2>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-p50" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-p95" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grad-p99" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="statDate"
                    tickFormatter={formatDate}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    minTickGap={24}
                  />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={54} unit="ms" />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: 6 }}
                    formatter={(value) => [`${value} ms`]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '10px' }}
                  />
                  {/* Enabled Smooth CSS Area/Line Animations */}
                  <Area type="monotone" dataKey="p50Ms" name="p50 Latency" stroke="#3b82f6" strokeWidth={2} fill="url(#grad-p50)" isAnimationActive={true} />
                  <Area type="monotone" dataKey="p95Ms" name="p95 Latency" stroke="#8b5cf6" strokeWidth={2} fill="url(#grad-p95)" isAnimationActive={true} />
                  <Area type="monotone" dataKey="p99Ms" name="p99 Latency" stroke="#f43f5e" strokeWidth={2} fill="url(#grad-p99)" isAnimationActive={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>{days} days ago</span>
              <span>Today</span>
            </div>
          </Card>

          {/* Daily Uptime Analytics Chart Dashboard */}
          <Card className="p-6 flex flex-col gap-4 bg-white border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">Uptime Reliability Distribution %</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="statDate"
                    tickFormatter={formatDate}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={[95, 100]}
                    tick={axisStyle}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: 6 }}
                    formatter={(value) => [`${value}%`, 'System Uptime']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="rect"
                    iconSize={10}
                    wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingBottom: '10px' }}
                  />
                  {/* Enhanced Rounded Corners Bars and Enabled Smooth Animations */}
                  <Bar dataKey="uptimePercent" name="Uptime Tracking" radius={[4, 4, 0, 0]} isAnimationActive={true}>
                    {stats.map((d, i) => (
                      <Cell key={i} fill={uptimeColor(d.uptimePercent)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>{days} days ago</span>
              <span>Today</span>
            </div>
          </Card>

          {/* Raw System Telemetry Ping Grid Matrix */}
          <Card className="p-6 flex flex-col gap-4 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Recent Automated Health Checks</h2>
              <StatusBadge status={totalChecks ? (upChecks / totalChecks > 0.99 ? 'active' : 'degraded') : 'paused'} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {pingLogs.slice(0, 18).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl px-3 py-2 bg-slate-50 text-xs font-semibold border border-slate-200 shadow-2xs hover:bg-slate-100/70 transition-colors"
                  title={`${new Date(log.checkedAt).toLocaleString()}\n${log.isUp ? 'OK' : 'FAIL'} ${log.statusCode || ''} ${log.responseTimeMs ? log.responseTimeMs + 'ms' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${log.isUp ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500 shadow-sm'}`} />
                    <span className="text-slate-700 truncate">
                      {log.responseTimeMs ? `${log.responseTimeMs}ms` : log.errorType || '—'}
                    </span>
                  </div>
                </div>
              ))}
              {pingLogs.length === 0 && (
                <span className="text-sm font-semibold text-slate-400 col-span-full py-4 text-center">
                  No ping logs available for this monitor.
                </span>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}