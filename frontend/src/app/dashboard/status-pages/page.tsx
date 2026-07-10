'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { StatusPageData } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { UptimeBars } from '@/components/ui/UptimeBars';
import { StatusDot } from '@/components/ui/StatusDot';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function StatusPagesPage() {
  const [data, setData] = useState<StatusPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getStatusPage();
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      setError('Failed to load status page data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const res = await api.getStatusPage();
        setData(res.data);
        setLastUpdated(new Date());
      } catch {
        setError('Failed to load status page data');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !data) {
    return <div className="text-center py-12 text-[var(--color-text-secondary)]">Loading status page...</div>;
  }

  if (error && !data) {
    return <div className="text-center py-12 text-[var(--color-down)]">{error}</div>;
  }

  if (!data) return null;

  const overallInfo = {
    operational: { color: 'var(--color-up)', label: 'All Systems Operational' },
    degraded: { color: 'var(--color-degraded)', label: 'Degraded Performance' },
    outage: { color: 'var(--color-down)', label: 'Major Outage' },
  }[data.overallStatus];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">Status Pages</h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-1">
            Public aggregate of your monitors (from <code className="text-[var(--color-brand)]">GET /api/status</code>)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-caption text-[var(--color-text-tertiary)]">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={refresh}>
            Refresh
          </Button>
          <Link href="/status" target="_blank">
            <Button variant="primary" size="sm">
              View public page
            </Button>
          </Link>
        </div>
      </div>

      <Card
        className="p-6 flex flex-col gap-3"
        style={{
          borderColor: overallInfo.color + '33',
          background: `linear-gradient(180deg, ${overallInfo.color}0D, transparent)`,
        }}
      >
        <div className="flex items-center gap-4">
          <StatusDot
            status={data.overallStatus}
            size="lg"
            className="shadow-[0_0_12px_var(--color-up)]"
          />
          <div>
            <h2 className="text-title-lg" style={{ color: overallInfo.color }}>
              {overallInfo.label}
            </h2>
            <p className="text-caption text-[var(--color-text-secondary)]">
              {data.monitors.length} monitors · {data.activeIncidents.length} active incident(s)
            </p>
          </div>
        </div>
      </Card>

      {data.activeIncidents.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-title-md text-[var(--color-text-primary)]">Active Incidents</h2>
          {data.activeIncidents.map((inc) => (
            <Card key={inc.id} className="p-5 border-l-4 border-[var(--color-down)]">
              <div className="flex items-center gap-2 mb-1">
                <StatusDot status="down" size="sm" />
                <span className="text-body-md font-semibold text-[var(--color-text-primary)]">
                  {inc.monitor.name}
                </span>
              </div>
              <p className="text-body-sm text-[var(--color-text-secondary)]">
                {inc.errorType || 'Unknown error'} — investigating
              </p>
              <p className="text-caption text-[var(--color-text-tertiary)] mt-1">
                Started {new Date(inc.startedAt).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-title-md text-[var(--color-text-primary)]">Monitors</h2>
        <Card className="p-0 divide-y divide-[var(--color-border)]">
          {data.monitors.map((m) => {
            const isUp = m.status === 'active' || m.status === 'operational';
            const isDegraded = m.status === 'degraded';
            const statusColor = isUp
              ? 'var(--color-up)'
              : isDegraded
              ? 'var(--color-degraded)'
              : 'var(--color-down)';
            const valid = m.uptime90d.filter((d) => d.uptimePercent !== null);
            const avg = valid.length
              ? (valid.reduce((a, c) => a + (c.uptimePercent || 0), 0) / valid.length).toFixed(2)
              : '100.00';
            return (
              <div key={m.id} className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-body-md font-semibold text-[var(--color-text-primary)] truncate">
                      {m.name}
                    </div>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)] truncate block"
                    >
                      {m.url}
                    </a>
                  </div>
                  <span
                    className="text-caption font-semibold"
                    style={{ color: statusColor }}
                  >
                    {isUp ? 'Operational' : isDegraded ? 'Degraded' : 'Outage'}
                  </span>
                </div>
                <UptimeBars data={m.uptime90d} compact />
                <div className="flex justify-between text-caption text-[var(--color-text-tertiary)]">
                  <span>90 days ago</span>
                  <span className="text-[var(--color-brand)] font-medium">{avg}% uptime</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })}
          {data.monitors.length === 0 && (
            <div className="p-12 text-center text-[var(--color-text-secondary)]">
              No public monitors configured (set statusPageVisible = true).
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
