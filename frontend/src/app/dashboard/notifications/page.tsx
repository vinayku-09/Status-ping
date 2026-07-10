'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { MonitorListItem } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import Link from 'next/link';

export default function NotificationsPage() {
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const res = await api.getMonitors();
        setMonitors(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch monitors');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonitors();
  }, []);

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--color-text-secondary)]">Loading monitors...</div>;
  }

  if (error) {
    return (
      <div className="text-[var(--color-down-text)] bg-[var(--color-down-subtle)] border border-[var(--color-down)]/20 rounded-[var(--radius-md)] px-4 py-3 text-body-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-title-xl text-[var(--color-text-primary)]">Notifications</h1>
        <p className="text-body-md text-[var(--color-text-secondary)] mt-1">
          Manage alert delivery for each of your monitors.
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        {monitors.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">
            No monitors found. Create a monitor first.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {monitors.map((monitor) => (
              <Link
                key={monitor.id}
                href={`/dashboard/monitors/${monitor.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[var(--color-surface-raised)]/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <StatusDot status={monitor.status} size="sm" />
                  <div className="min-w-0">
                    <h3 className="text-body-md font-semibold text-[var(--color-text-primary)] truncate">
                      {monitor.name}
                    </h3>
                    <p className="text-caption text-[var(--color-text-tertiary)] truncate">{monitor.url}</p>
                  </div>
                </div>
                <span className="shrink-0 text-caption font-medium px-2.5 py-1 rounded-full bg-[var(--color-brand-subtle)] text-[var(--color-brand-text)]">
                  Manage →
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
