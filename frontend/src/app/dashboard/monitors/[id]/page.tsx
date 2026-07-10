'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { MonitorDetail, PingLog } from '@/lib/types';
import { StatusDot } from '@/components/ui/StatusDot';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Tabs } from '@/components/ui/Tabs';
import { KPICard } from '@/components/ui/KPICard';
import { UptimeBars, UptimeBarData } from '@/components/ui/UptimeBars';
import { Card } from '@/components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';

export default function MonitorDetailPage() {
  const router = useRouter();
  // Next.js 15: params is a Promise. In a Client Component use useParams()
  // which returns the resolved params object synchronously (stable reference).
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const [monitorDetail, setMonitorDetail] = useState<MonitorDetail | null>(null);
  const [pingLogs, setPingLogs] = useState<PingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    let active = true;

    const fetchMonitor = async () => {
      setIsLoading(true);
      setError('');
      setNotFound(false);
      try {
        // Single request: GET /api/monitors/:id already includes pingLogs,
        // openIncident, latestSslCheck and stats in its response.
        const detailRes = await api.getMonitor(id);
        if (!active) return;
        setMonitorDetail(detailRes.data);
        setPingLogs(detailRes.data.pingLogs);
      } catch (err) {
        if (!active) return;
        const httpStatus =
          err && typeof err === 'object' && 'status' in err
            ? (err as { status?: number }).status
            : undefined;
        if (httpStatus === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load monitor');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchMonitor();
    return () => {
      active = false;
    };
  }, [id]);

  const generateMock90dUptime = (status: string): UptimeBarData[] => {
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

  if (isLoading) {
    return <div className="py-12 text-center text-[var(--color-text-secondary)]">Loading monitor details...</div>;
  }

  if (notFound) {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <div className="text-title-md text-[var(--color-text-primary)]">Monitor not found</div>
        <p className="text-body-sm text-[var(--color-text-secondary)] max-w-md">
          This monitor doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button variant="secondary" onClick={() => router.push('/dashboard/monitors')}>
          Back to monitors
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center gap-4 text-center">
        <div className="text-title-md text-[var(--color-down-text)]">{error}</div>
        <Button
          variant="secondary"
          onClick={() => {
            setError('');
            setIsLoading(true);
            api
              .getMonitor(id)
              .then((res) => {
                setMonitorDetail(res.data);
                setPingLogs(res.data.pingLogs);
              })
              .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load monitor');
              })
              .finally(() => setIsLoading(false));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!monitorDetail) {
    return <div className="py-12 text-center text-[var(--color-text-secondary)]">Monitor not found.</div>;
  }

  const { monitor, stats } = monitorDetail;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'ping-logs', label: 'Ping Logs' },
    { id: 'incidents', label: 'Incidents' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'ssl', label: 'SSL' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusDot status={monitor.status} size="lg" />
          <div className="flex flex-col">
            <h1 className="text-title-xl text-[var(--color-text-primary)] flex items-center gap-3">
              {monitor.name}
              <StatusBadge status={monitor.status} />
            </h1>
            <a href={monitor.url} target="_blank" rel="noreferrer" className="text-body-md text-[var(--color-brand)] hover:underline mt-1">
              {monitor.url}
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.push('/dashboard/monitors')}>Back</Button>
          <Button variant={monitor.status === 'paused' ? 'primary' : 'secondary'}>
            {monitor.status === 'paused' ? 'Resume' : 'Pause'}
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              label="30d Uptime" 
              value={stats.uptimePercent30d ? `${stats.uptimePercent30d}%` : 'N/A'} 
              trend={stats.uptimePercent30d && stats.uptimePercent30d > 99 ? 'up' : 'down'} 
            />
            <KPICard 
              label="P95 Response Time" 
              value={stats.p95ResponseTimeMs ? `${stats.p95ResponseTimeMs}ms` : 'N/A'} 
            />
            <KPICard 
              label="Check Interval" 
              value={`${monitor.checkIntervalMinutes}m`} 
            />
            <KPICard 
              label="Consecutive Failures" 
              value={monitor.consecutiveFailures} 
              trend={monitor.consecutiveFailures > 0 ? 'down' : 'up'}
            />
          </div>

          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-title-md text-[var(--color-text-primary)]">90-Day Uptime History</h2>
              <span className="text-body-sm text-[var(--color-text-secondary)]">Overall {stats.uptimePercent30d}%</span>
            </div>
            <UptimeBars data={generateMock90dUptime(monitor.status)} />
            <div className="flex justify-between text-caption text-[var(--color-text-tertiary)]">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'ping-logs' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-title-md text-[var(--color-text-primary)]">Recent Pings</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pingLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.checkedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${log.isUp ? 'bg-[var(--color-up-subtle)] text-[var(--color-up-text)]' : 'bg-[var(--color-down-subtle)] text-[var(--color-down-text)]'}`}>
                      {log.isUp ? 'OK' : 'FAIL'}
                    </span>
                  </TableCell>
                  <TableCell>{log.responseTimeMs ? `${log.responseTimeMs}ms` : '-'}</TableCell>
                  <TableCell>{log.statusCode || '-'}</TableCell>
                  <TableCell>{log.errorType || '-'}</TableCell>
                </TableRow>
              ))}
              {pingLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-[var(--color-text-secondary)]">No ping logs available.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Other tabs intentionally left blank for this scope */}
      {['incidents', 'alerts', 'ssl', 'settings'].includes(activeTab) && (
        <div className="py-12 text-center text-[var(--color-text-secondary)]">
          This tab is under construction.
        </div>
      )}
    </div>
  );
}
