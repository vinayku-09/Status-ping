'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/apiClient';
import { Incident, MonitorListItem } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusDot } from '@/components/ui/StatusDot';
import { formatDuration } from '@/lib/utils';

interface IncidentRow extends Incident {
  monitorName: string;
  monitorUrl: string;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Edit modal state
  const [editing, setEditing] = useState<IncidentRow | null>(null);
  const [rootCause, setRootCause] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchIncidents = async () => {
    setError('');
    try {
      const monitorsRes = await api.getMonitors({ limit: 100 });
      const monitors = monitorsRes.data as MonitorListItem[];

      const rows = await Promise.all(
        monitors.map(async (m) => {
          try {
            const res = await api.getIncidents(m.id, { limit: 50 });
            return (res.data as Incident[]).map((inc) => ({
              ...inc,
              monitorName: m.name,
              monitorUrl: m.url,
            }));
          } catch {
            return [];
          }
        })
      );

      const flat = rows.flat().sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      setIncidents(flat);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    }
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchIncidents();
      setIsLoading(false);
    };
    load();
  }, []);

  const openEdit = (inc: IncidentRow) => {
    setEditing(inc);
    setRootCause(inc.rootCause || '');
    setSaveError('');
  };

  const saveRootCause = async () => {
    if (!editing) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await api.updateIncident(editing.id, { rootCause });
      setEditing(null);
      await fetchIncidents();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update incident');
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = incidents.filter((i) =>
    statusFilter === 'all' ? true : i.status === statusFilter
  );

  const openCount = incidents.filter((i) => i.status === 'open').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--color-text-secondary)]">Loading incidents...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-xl text-[var(--color-text-primary)]">Incidents</h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-1">
            All incidents across your monitors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All ({incidents.length})
          </Button>
          <Button
            variant={statusFilter === 'open' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('open')}
          >
            Open ({openCount})
          </Button>
          <Button
            variant={statusFilter === 'resolved' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-[var(--color-down-text)] bg-[var(--color-down-subtle)] border border-[var(--color-down)]/20 rounded-[var(--radius-md)] px-4 py-3 text-body-sm">
          {error}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-secondary)]">
            No {statusFilter === 'all' ? '' : statusFilter} incidents found.
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((inc) => (
              <div key={inc.id} className="p-5 flex flex-col gap-3 hover:bg-[var(--color-surface-raised)]/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <StatusDot
                      status={inc.status === 'open' ? 'down' : 'operational'}
                      size="md"
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/dashboard/monitors/${inc.monitorId}`}
                          className="text-body-md font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-brand)] truncate"
                        >
                          {inc.monitorName}
                        </Link>
                        <StatusBadge status={inc.status === 'open' ? 'down' : 'operational'} />
                        {inc.errorType && (
                          <span className="text-caption px-2 py-0.5 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] font-medium">
                            {inc.errorType}
                          </span>
                        )}
                      </div>
                      <a
                        href={inc.monitorUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-brand)] truncate block"
                      >
                        {inc.monitorUrl}
                      </a>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(inc)}>
                    Edit root cause
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-caption text-[var(--color-text-secondary)]">
                  <div>
                    <span className="block text-[var(--color-text-tertiary)]">Started</span>
                    {new Date(inc.startedAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="block text-[var(--color-text-tertiary)]">Resolved</span>
                    {inc.resolvedAt ? new Date(inc.resolvedAt).toLocaleString() : '—'}
                  </div>
                  <div>
                    <span className="block text-[var(--color-text-tertiary)]">Duration</span>
                    {inc.durationSeconds ? formatDuration(inc.durationSeconds) : '—'}
                  </div>
                  <div>
                    <span className="block text-[var(--color-text-tertiary)]">Root Cause</span>
                    <span className="text-[var(--color-text-primary)] line-clamp-1">
                      {inc.rootCause || 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Incident Root Cause"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveRootCause} isLoading={isSaving}>
              Save
            </Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-4">
            <p className="text-body-sm text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">{editing.monitorName}</strong> ·{' '}
              {editing.errorType || 'Incident'}
            </p>
            <Input
              label="Root Cause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="e.g. Connection pool exhaustion during peak traffic"
            />
            {saveError && <p className="text-caption text-[var(--color-down)]">{saveError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
