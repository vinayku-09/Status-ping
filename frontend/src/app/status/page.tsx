'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { StatusPageData } from '@/lib/types';
import { UptimeBars } from '@/components/ui/UptimeBars';

export default function PublicStatusPage() {
  const [data, setData] = useState<StatusPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.getStatusPage();
        setData(res.data);
      } catch (err: any) {
        setError('Failed to load status page');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
    
    // Auto refresh every 60s
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--color-canvas)]">
        <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-[var(--color-border)] border-t-[var(--color-brand)]"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[var(--color-canvas)]">
        <div className="text-center py-20 text-[var(--color-down)] font-medium">
          {error || 'Unable to load status page'}
        </div>
      </div>
    );
  }

  const getOverallStatusInfo = () => {
    switch (data.overallStatus) {
      case 'operational': return { color: 'var(--color-up)', bg: 'var(--color-up-subtle)', text: 'All Systems Operational' };
      case 'degraded': return { color: 'var(--color-degraded)', bg: 'var(--color-degraded-subtle)', text: 'Degraded Performance' };
      case 'outage': return { color: 'var(--color-down)', bg: 'var(--color-down-subtle)', text: 'Major Outage' };
      default: return { color: 'var(--color-text-secondary)', bg: 'var(--color-surface-raised)', text: 'Unknown Status' };
    }
  };

  const statusInfo = getOverallStatusInfo();

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] font-sans selection:bg-[var(--color-brand-subtle)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 flex flex-col gap-12">
        
        {/* Header / Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--color-brand)] shadow-[var(--shadow-glow-brand)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <span className="text-title-lg font-bold">StatusPing</span>
          </div>
        </div>

        {/* Overall Status Hero */}
        <div 
          className="rounded-[var(--radius-lg)] p-8 shadow-[var(--shadow-md)] border flex flex-col gap-2"
          style={{ backgroundColor: statusInfo.bg, borderColor: statusInfo.color + '33' }}
        >
          <div className="flex items-center gap-4">
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50" style={{ backgroundColor: statusInfo.color }}></span>
              <span className="relative inline-flex rounded-full h-5 w-5" style={{ backgroundColor: statusInfo.color, boxShadow: `0 0 12px ${statusInfo.color}` }}></span>
            </span>
            <h1 className="text-display font-semibold" style={{ color: statusInfo.color }}>
              {statusInfo.text}
            </h1>
          </div>
          <p className="text-body-md" style={{ color: statusInfo.color, opacity: 0.8 }}>
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Active Incidents */}
        {data.activeIncidents.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-title-lg font-bold">Active Incidents</h2>
            <div className="flex flex-col gap-4">
              {data.activeIncidents.map(incident => (
                <div key={incident.id} className="bg-[var(--color-surface)] border-l-4 border-[var(--color-down)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] flex flex-col gap-3">
                  <h3 className="text-title-md font-bold text-[var(--color-text-primary)]">{incident.monitor.name} — Investigating</h3>
                  <p className="text-body-md text-[var(--color-text-secondary)]">
                    We are currently experiencing an issue ({incident.errorType || 'Unknown Error'}). Our team is investigating and working on a resolution.
                  </p>
                  <p className="text-caption text-[var(--color-text-tertiary)] mt-2">
                    Started at {new Date(incident.startedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitors List */}
        <div className="flex flex-col gap-6">
          <h2 className="text-title-lg font-bold">Uptime Overview</h2>
          <div className="bg-[var(--color-surface)] shadow-[var(--shadow-sm)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {data.monitors.map(monitor => {
              
              const isUp = monitor.status === 'active' || monitor.status === 'operational';
              const isDegraded = monitor.status === 'degraded';
              const statusColor = isUp ? 'var(--color-up)' : (isDegraded ? 'var(--color-degraded)' : 'var(--color-down)');
              const statusText = isUp ? 'Operational' : (isDegraded ? 'Degraded' : 'Outage');
              
              // Calculate 90d average
              const validDays = monitor.uptime90d.filter(d => d.uptimePercent !== null);
              const avgUptime = validDays.length > 0 
                ? (validDays.reduce((acc, curr) => acc + (curr.uptimePercent || 0), 0) / validDays.length).toFixed(2)
                : '100.00';

              return (
                <div key={monitor.id} className="p-6 sm:p-8 flex flex-col gap-5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-title-md font-semibold">{monitor.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-body-sm font-medium" style={{ color: statusColor }}>{statusText}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <UptimeBars data={monitor.uptime90d} className="h-10" />
                    <div className="flex justify-between items-center text-caption text-[var(--color-text-tertiary)] font-medium">
                      <span>90 days ago</span>
                      <span className="text-[var(--color-brand)] bg-[var(--color-brand-subtle)] px-2 py-0.5 rounded">{avgUptime}% Uptime</span>
                      <span>Today</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {data.monitors.length === 0 && (
              <div className="p-12 text-center text-body-lg text-[var(--color-text-secondary)]">
                No public monitors configured.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-8 border-t border-[var(--color-border)] text-center">
          <a href="/" className="text-caption text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors inline-flex items-center gap-1.5">
            Powered by <strong className="font-semibold">StatusPing</strong>
          </a>
        </div>
      </div>
    </div>
  );
}
