'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/apiClient';
import { MonitorListItem, Incident } from '@/lib/types';

type DashboardIncident = Incident & { monitorName: string };
import { KPICard } from '@/components/ui/KPICard';
import { Card } from '@/components/ui/Card';
import { UptimeBars, UptimeBarData } from '@/components/ui/UptimeBars';
import { StatusDot } from '@/components/ui/StatusDot';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Pause } from 'lucide-react';

export default function DashboardOverviewPage() {
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monitorsRes = await api.getMonitors();
        setMonitors(monitorsRes.data);

        // Fetch incidents across all monitors (backend has no global incidents list)
        const monitors = monitorsRes.data;
        const rows = await Promise.all(
          monitors.map(async (m) => {
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
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-[var(--color-text-secondary)]">Loading dashboard...</div>;
  }

  const totalMonitors = monitors.length;
  const upMonitors = monitors.filter(m => m.status === 'active').length;
  const downMonitors = monitors.filter(m => m.status === 'down').length;
  const avgUptime = monitors.length 
    ? (monitors.reduce((acc, m) => acc + (m.uptimePercent30d || 100), 0) / monitors.length).toFixed(2)
    : '100.00';

  // Mock 90 day data generator
  const generateMockUptime = (status: string): UptimeBarData[] => {
    return Array.from({ length: 90 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (89 - i));
      const percent = status === 'down' && i > 85 ? 0 : 99.9 + (Math.random() * 0.1);
      return {
        date: date.toISOString().split('T')[0],
        uptimePercent: percent
      };
    });
  };

  const generateMockLatency = (status: string) => {
    return Array.from({ length: 20 }).map((_, i) => ({
      time: i.toString(),
      latency: status === 'down' ? 0 : 40 + Math.random() * 60
    }));
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">Overview</h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-1">Your infrastructure at a glance</p>
        </div>
        <Link href="/dashboard/monitors/new">
          <Button variant="primary">Create Monitor</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Monitors" value={totalMonitors} />
        <KPICard label="Up & Running" value={upMonitors} trend="up" trendText="All good" />
        <KPICard label="Currently Down" value={downMonitors} trend={downMonitors > 0 ? "down" : "neutral"} trendText={downMonitors > 0 ? "Needs attention" : "No issues"} />
        <KPICard label="30d Avg Uptime" value={`${avgUptime}%`} trend={Number(avgUptime) > 99 ? "up" : "down"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-title-lg text-[var(--color-text-primary)]">Monitor Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.map(monitor => (
              <Card key={monitor.id} className="p-5 flex flex-col gap-4 group transition-all duration-200 hover:border-[var(--color-brand)] hover:shadow-sm" clickable={true}>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-title-md text-[var(--color-text-primary)] font-semibold group-hover:text-[var(--color-brand)] transition-colors">{monitor.name}</span>
                    <span className="text-caption text-[var(--color-text-tertiary)]">{monitor.url}</span>
                  </div>
                  <StatusBadge status={monitor.status} />
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  <div className="h-8 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generateMockLatency(monitor.status)}>
                        <Line type="monotone" dataKey="latency" stroke="var(--color-brand)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <UptimeBars data={generateMockUptime(monitor.status)} compact />
                    <div className="flex justify-between text-caption text-[var(--color-text-tertiary)] mt-1">
                      <span>90 days ago</span>
                      <span>{monitor.uptimePercent30d ?? 100}% uptime</span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {monitors.length === 0 && (
              <div className="col-span-full py-12 text-center text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)]">
                No monitors configured yet.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="text-title-lg text-[var(--color-text-primary)]">Active Incidents</h2>
            <Card className="p-0 overflow-hidden">
              {incidents.filter(i => i.status === 'open').length === 0 ? (
                <div className="p-6 text-center text-body-sm text-[var(--color-text-secondary)]">
                  No active incidents.
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                   {incidents.filter(i => i.status === 'open').map(inc => (
                     <div key={inc.id} className="p-4 flex flex-col gap-2 bg-[var(--color-down-subtle)]/30">
                       <div className="flex items-center gap-2">
                         <StatusDot status="down" size="sm" />
                         <span className="text-body-sm font-semibold text-[var(--color-text-primary)]">{inc.monitorName}</span>
                       </div>
                       <span className="text-caption text-[var(--color-text-secondary)]">Started: {new Date(inc.startedAt).toLocaleString()}</span>
                       <span className="text-caption text-[var(--color-down)] font-medium">{inc.errorType}</span>
                     </div>
                   ))}
                </div>
              )}
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-title-lg text-[var(--color-text-primary)]">Recent Activity</h2>
            <Card className="p-0 overflow-hidden">
              <div className="p-6 flex flex-col gap-6 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[39px] top-8 bottom-8 w-px bg-[var(--color-border)]"></div>
                
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-up-subtle)] border border-[var(--color-up-subtle)] flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-up)]" />
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-body-sm text-[var(--color-text-primary)]">Monitor <strong className="font-semibold">Marketing Site</strong> resumed</span>
                    <span className="text-caption text-[var(--color-text-tertiary)]">2 hours ago</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-up-subtle)] border border-[var(--color-up-subtle)] flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-up)]" />
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-body-sm text-[var(--color-text-primary)]">Incident on <strong className="font-semibold">Database</strong> resolved</span>
                    <span className="text-caption text-[var(--color-text-tertiary)]">Yesterday, 14:20</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-paused-subtle)] border border-[var(--color-paused-subtle)] flex items-center justify-center shrink-0 z-10">
                    <Pause className="w-4 h-4 text-[var(--color-paused)]" />
                  </div>
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-body-sm text-[var(--color-text-primary)]">Monitor <strong className="font-semibold">Database</strong> paused</span>
                    <span className="text-caption text-[var(--color-text-tertiary)]">Yesterday, 10:00</span>
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
