'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { Tooltip } from './ui/Tooltip';
import { StatusDot } from './ui/StatusDot';

export function HealthBadge() {
  const [health, setHealth] = useState<{
    status: 'ok' | 'degraded' | 'error';
    postgres: string;
    redis: string;
  } | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.getHealth();
        setHealth(res);
      } catch {
        setHealth({ status: 'error', postgres: 'disconnected', redis: 'disconnected' });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return null;

  const getStatusString = () => {
    switch (health.status) {
      case 'ok': return 'operational';
      case 'degraded': return 'degraded';
      case 'error': return 'down';
      default: return 'paused';
    }
  };

  const getStatusText = () => {
    switch (health.status) {
      case 'ok': return 'All systems operational';
      case 'degraded': return 'API degraded';
      case 'error': return 'API outage';
      default: return 'Unknown status';
    }
  };

  return (
    <Tooltip 
      content={
        <div className="flex flex-col gap-1">
          <div className="font-semibold">{getStatusText()}</div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">PostgreSQL: {health.postgres}</div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">Redis: {health.redis}</div>
        </div>
      } 
      position="bottom"
    >
      <div className="flex items-center gap-2 px-2 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full hover:bg-[var(--color-surface-raised)] transition-colors cursor-default">
        <StatusDot status={getStatusString()} size="sm" />
        <span className="text-[12px] font-medium text-[var(--color-text-secondary)] hidden sm:inline-block">
          {getStatusText()}
        </span>
      </div>
    </Tooltip>
  );
}
