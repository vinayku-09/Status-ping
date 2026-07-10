'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { AiInsight, AiInsightSeverity, AiInsightCategory } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const severityConfig: Record<AiInsightSeverity, { color: string; bg: string; label: string }> = {
  info: { color: 'var(--color-brand)', bg: 'var(--color-brand-subtle)', label: 'Info' },
  warning: { color: 'var(--color-degraded)', bg: 'var(--color-degraded-subtle)', label: 'Warning' },
  critical: { color: 'var(--color-down)', bg: 'var(--color-down-subtle)', label: 'Critical' },
};

const categoryConfig: Record<AiInsightCategory, { label: string; icon: string }> = {
  performance: { label: 'Performance', icon: '⚡' },
  reliability: { label: 'Reliability', icon: '🛡️' },
  security: { label: 'Security', icon: '🔒' },
  optimization: { label: 'Optimization', icon: '✨' },
};

export default function AiInsightsPage() {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handleRefresh = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getAiInsights();
      setInsights(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setError('');
      try {
        const res = await api.getAiInsights();
        setInsights(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load AI insights');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--color-text-secondary)]">Analyzing your infrastructure...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-xl text-[var(--color-text-primary)] flex items-center gap-2">
            <span className="text-[var(--color-brand)]">✦</span> AI Insights
          </h1>
          <p className="text-body-md text-[var(--color-text-secondary)] mt-1">
            Proactive recommendations from <code className="text-[var(--color-brand)]">GET /api/ai-insights</code>
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleRefresh}>
          Regenerate
        </Button>
      </div>

      {error && (
        <div className="text-[var(--color-down-text)] bg-[var(--color-down-subtle)] border border-[var(--color-down)]/20 rounded-[var(--radius-md)] px-4 py-3 text-body-sm">
          {error}
        </div>
      )}

      {!error && insights.length === 0 && (
        <Card className="p-12 text-center text-[var(--color-text-secondary)]">
          No insights available right now.
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {insights.map((ins) => {
          const sev = severityConfig[ins.severity];
          const cat = categoryConfig[ins.category];
          return (
            <Card key={ins.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-caption font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: sev.color, backgroundColor: sev.bg }}
                  >
                    {sev.label}
                  </span>
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    {cat.icon} {cat.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${ins.confidence}%`, backgroundColor: sev.color }}
                    />
                  </div>
                  <span className="text-caption text-[var(--color-text-tertiary)]">{ins.confidence}%</span>
                </div>
              </div>

              <h2 className="text-title-md text-[var(--color-text-primary)]">{ins.title}</h2>
              <p className="text-body-sm text-[var(--color-text-secondary)]">{ins.description}</p>

              {ins.monitorName && (
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Related monitor: <strong className="text-[var(--color-text-secondary)]">{ins.monitorName}</strong>
                </span>
              )}

              <div className="mt-auto pt-2 border-t border-[var(--color-border)]">
                <p className="text-caption font-semibold text-[var(--color-text-primary)]">Suggested action</p>
                <p className="text-body-sm text-[var(--color-text-secondary)]">{ins.suggestedAction}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
