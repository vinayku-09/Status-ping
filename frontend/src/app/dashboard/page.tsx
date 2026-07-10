'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/lib/apiClient';
import { MonitorListItem, Incident } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { UptimeBars, UptimeBarData } from '@/components/ui/UptimeBars';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { 
  CheckCircle2, 
  XCircle, 
  Pause, 
  Server, 
  Activity, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  ExternalLink
} from 'lucide-react';

type DashboardIncident = Incident & { monitorName: string };

// Framer Motion Animation Variants for Staggered Load
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function DashboardOverviewPage() {
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monitorsRes = await api.getMonitors();
        setMonitors(monitorsRes.data);

        const monitorsData = monitorsRes.data;
        const rows = await Promise.all(
          monitorsData.map(async (m) => {
            try {
              const res = await api.getIncidents(m.id, { limit: 20, status: 'open' });
              return (res.data as Incident[]).map((inc) => ({
                ...inc,
                monitorName: m.name,
              }));
            } catch {
              return [];
            }
          })
        );
        const flat = rows
          .flat()
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        setIncidents(flat);
      } catch (err) {
        console.error("Failed to fetch dashboard overview metrics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full text-[var(--color-text-secondary)] font-medium">
        <div className="flex items-center gap-3 bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3 rounded-xl shadow-sm">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Assembling real-time health metrics...</span>
        </div>
      </div>
    );
  }

  const totalMonitors = monitors.length;
  const upMonitors = monitors.filter(m => m.status === 'active' || m.status === 'operational').length;
  const downMonitors = monitors.filter(m => m.status === 'down').length;
  const avgUptime = monitors.length 
    ? (monitors.reduce((acc, m) => acc + (m.uptimePercent30d || 100), 0) / monitors.length).toFixed(2)
    : '100.00';

  // 90 Day Uptime Sample Generator
  const generateMockUptime = (status: string): UptimeBarData[] => {
    return Array.from({ length: 90 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (89 - i));
      let percent = 100;
      if (status === 'down' && i > 85) {
        percent = 0;
      } else if (Math.random() > 0.96) {
        percent = 92.4 + Math.random() * 6; // Minor incident simulation
      } else {
        percent = 99.8 + (Math.random() * 0.2);
      }
      return {
        date: date.toISOString().split('T')[0],
        uptimePercent: percent
      };
    });
  };

  // Sparkline Core Metrics Generator
  const generateMockLatency = (status: string) => {
    return Array.from({ length: 24 }).map((_, i) => ({
      time: `${i}h`,
      latency: status === 'down' && i > 20 ? 0 : 35 + Math.random() * 45 + (i % 3 === 0 ? Math.random() * 30 : 0)
    }));
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full px-4 md:px-6 py-4 bg-[#f8fbff]/40 min-h-screen">
      
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">System Overview</h1>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-1">
            Real-time status tracking, continuous diagnostics, and incident monitoring feeds.
          </p>
        </div>
        <Link href="/dashboard/monitors/new">
          <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all rounded-lg inline-flex items-center gap-2">
            <Server className="w-4 h-4" />
            <span>Create Monitor</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid Component Array */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {/* Total Monitors */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Total Systems</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{totalMonitors}</h3>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1">
                <span>Configured active points</span>
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Up & Running */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Operational</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{upMonitors}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>All engines green</span>
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Currently Down */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Outages</span>
              <div className={`p-2 rounded-xl border transition-colors duration-200 ${
                downMonitors > 0 
                  ? 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white' 
                  : 'bg-slate-50 text-slate-500 border-slate-100'
              }`}>
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{downMonitors}</h3>
              <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${downMonitors > 0 ? 'text-rose-600' : 'text-[var(--color-text-tertiary)]'}`}>
                {downMonitors > 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3 animate-pulse" />
                    <span>Requires urgent investigation</span>
                  </>
                ) : (
                  <span>Zero critical alerts</span>
                )}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* 30d Avg Uptime */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Avg 30d SLA</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">{avgUptime}%</h3>
              <p className="text-xs text-indigo-600 font-medium mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                <span>Maintaining standard SLA</span>
              </p>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Structural Matrix Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Interactive Section: Monitor Clusters */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span>Monitored Endpoints</span>
              <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-medium">{monitors.length}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.map((monitor) => {
              const latencyData = generateMockLatency(monitor.status);
              const currentLatency = latencyData[latencyData.length - 1].latency.toFixed(0);

              return (
                <Link key={monitor.id} href={`/dashboard/monitors/${monitor.id}`} className="block group">
                  <Card 
                    className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm transition-all duration-200 group-hover:border-blue-500 group-hover:shadow-md flex flex-col gap-4 relative overflow-hidden h-full"
                    clickable
                  >
                    {/* Minimal decorative state indicators */}
                    <div className={`absolute top-0 left-0 w-full h-[3px] ${
                      monitor.status === 'down' ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} />

                    <div className="flex items-start justify-between gap-2 mt-1">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[var(--color-text-primary)] truncate group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          {monitor.name}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500" />
                        </span>
                        <span className="text-xs text-[var(--color-text-tertiary)] truncate mt-0.5">{monitor.url}</span>
                      </div>
                      <StatusBadge status={monitor.status} />
                    </div>

                    {/* Integrated Analytics Micro-Sparkline */}
                    <div className="flex items-end justify-between border-t border-b border-slate-100/70 py-3 my-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-text-tertiary)]">Current Ping</span>
                        <span className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
                          {monitor.status === 'down' ? '—' : `${currentLatency} ms`}
                        </span>
                      </div>
                      <div className="h-9 w-28 opacity-80 group-hover:opacity-100 transition-opacity">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={latencyData}>
                            <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                            <Line 
                              type="monotone" 
                              dataKey="latency" 
                              stroke={monitor.status === 'down' ? 'var(--color-down)' : '#2563eb'} 
                              strokeWidth={1.75} 
                              dot={false} 
                              isAnimationActive={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Horizontal 90d Performance Visualizer Block */}
                    <div className="space-y-2">
                      <UptimeBars data={generateMockUptime(monitor.status)} compact />
                      <div className="flex justify-between items-center text-[11px] font-medium text-[var(--color-text-tertiary)]">
                        <span>90 days ago</span>
                        <span className="text-[var(--color-text-secondary)] font-semibold">{monitor.uptimePercent30d ?? 100}% metrics</span>
                        <span>Today</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}

            {monitors.length === 0 && (
              <div className="col-span-full py-16 px-4 text-center border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] rounded-2xl flex flex-col items-center justify-center gap-3">
                <div className="p-3 rounded-full bg-slate-50 text-slate-400">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">No endpoints configured</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Get notified immediately when your site slows down or stops responding.</p>
                </div>
                <Link href="/dashboard/monitors/new" className="mt-2">
                  <Button size="sm" variant="secondary">Add First Monitor</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Connected Activity Timeline & Active Incidents */}
        <div className="flex flex-col gap-6">
          
          {/* Active Incidents Matrix */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <span>Active Alerts</span>
              {incidents.filter(i => i.status === 'open').length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-rose-50 border border-rose-100 text-rose-600 rounded-full font-bold animate-pulse">
                  {incidents.filter(i => i.status === 'open').length}
                </span>
              )}
            </h2>
            <Card className="p-0 overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm">
              {incidents.filter(i => i.status === 'open').length === 0 ? (
                <div className="p-6 text-center text-sm text-[var(--color-text-secondary)] flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium">All infrastructure operational</span>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {incidents.filter(i => i.status === 'open').map(inc => (
                    <div key={inc.id} className="p-4 flex flex-col gap-2 bg-rose-50/20 border-l-4 border-rose-500">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">{inc.monitorName}</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md shrink-0">Downtime</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] pl-6 space-y-1">
                        <p className="font-semibold text-rose-700">{inc.errorType || "Connection Timeout"}</p>
                        <div className="flex items-center gap-1 text-[var(--color-text-tertiary)] text-[11px]">
                          <Clock className="w-3 h-3" />
                          <span>Triggered: {new Date(inc.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* High-Fidelity Recent Activity Timeline Component */}
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">System Logs & Activity</h2>
            <Card className="p-5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm">
              <div className="flex flex-col gap-6 relative">
                
                {/* Clean Vertical Timeline Connecting Bar */}
                <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-100" />
                
                {/* Timeline Item 1 - Resumed State */}
                <div className="flex items-start gap-4 relative z-10 group/item">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover/item:scale-110">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex flex-col pt-0.5">
                    <span className="text-xs text-[var(--color-text-primary)] leading-normal">
                      Monitor <strong className="font-bold text-slate-900">Marketing Site</strong> verified stable and operational.
                    </span>
                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>2 hours ago</span>
                    </span>
                  </div>
                </div>

                {/* Timeline Item 2 - Resolved Outage */}
                <div className="flex items-start gap-4 relative z-10 group/item">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover/item:scale-110">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col pt-0.5">
                    <span className="text-xs text-[var(--color-text-primary)] leading-normal">
                      Incident on <strong className="font-bold text-slate-900">Core API Database Cluster</strong> resolved successfully.
                    </span>
                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Yesterday, 14:20</span>
                    </span>
                  </div>
                </div>

                {/* Timeline Item 3 - Maintenance / Paused State */}
                <div className="flex items-start gap-4 relative z-10 group/item">
                  <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover/item:scale-110">
                    <Pause className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex flex-col pt-0.5">
                    <span className="text-xs text-[var(--color-text-primary)] leading-normal">
                      Monitor <strong className="font-bold text-slate-900">Staging Environment</strong> paused by operator control.
                    </span>
                    <span className="text-[11px] font-medium text-[var(--color-text-tertiary)] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Yesterday, 10:00</span>
                    </span>
                  </div>
                </div>

              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}