'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/apiClient';
import { MonitorListItem } from '@/lib/types';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBars, UptimeBarData } from '@/components/ui/UptimeBars';
import { Button } from '@/components/ui/Button';

export default function MonitorsListPage() {
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const res = await api.getMonitors();
        setMonitors(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonitors();
  }, []);

  const generateMockMiniUptime = (status: string): UptimeBarData[] => {
    return Array.from({ length: 30 }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const percent = status === 'down' && i > 25 ? 0 : 99.9 + (Math.random() * 0.1);
      return {
        date: date.toISOString().split('T')[0],
        uptimePercent: percent
      };
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">Monitors</h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-1">Manage and view all your services</p>
        </div>
        <Link href="/dashboard/monitors/new">
          <Button variant="primary">Create Monitor</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-[var(--color-text-secondary)]">Loading monitors...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>30d Uptime</TableHead>
              <TableHead>Response</TableHead>
              <TableHead>Last Check</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monitors.map(monitor => (
              <TableRow key={monitor.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[var(--color-text-primary)]">{monitor.name}</span>
                    <span className="text-caption text-[var(--color-text-tertiary)] truncate max-w-[200px]">{monitor.url}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={monitor.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm font-medium w-12">
                      {monitor.uptimePercent30d !== null ? `${monitor.uptimePercent30d}%` : 'N/A'}
                    </span>
                    <div className="w-24">
                      <UptimeBars data={generateMockMiniUptime(monitor.status)} compact />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    {monitor.status === 'active' ? '124ms' : '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-body-sm text-[var(--color-text-secondary)]">
                    {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleTimeString() : 'Never'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/monitors/${monitor.id}`}>
                    <Button variant="ghost" size="sm">View</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {monitors.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-[var(--color-text-secondary)]">
                  No monitors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
