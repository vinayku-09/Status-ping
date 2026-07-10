'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { CheckInterval, CreateMonitorBody } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function CreateMonitorPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<CreateMonitorBody>({
    name: '',
    url: '',
    checkIntervalMinutes: 5,
    failureThreshold: 3,
    timeoutSeconds: 30,
    statusPageVisible: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await api.createMonitor(formData);
      router.push(`/dashboard/monitors/${res.data.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create monitor');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-title-xl text-[var(--color-text-primary)]">Create Monitor</h1>
        <p className="text-body-md text-[var(--color-text-secondary)] mt-1">Add a new endpoint to start tracking its uptime.</p>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="p-3 bg-[var(--color-down-subtle)] text-[var(--color-down-text)] rounded-[var(--radius-md)] text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid gap-6">
            <Input
              label="Monitor Name"
              id="name"
              placeholder="e.g. Production API"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <Input
              label="URL to Monitor"
              id="url"
              type="url"
              placeholder="https://api.example.com/health"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              helperText="Must include http:// or https://"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col w-full">
                <label className="text-[var(--color-text-secondary)] font-medium text-[13px] mb-1.5">
                  Check Interval
                </label>
                <select
                  className="flex w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
                  value={formData.checkIntervalMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkIntervalMinutes: Number(e.target.value) as CheckInterval }))}
                >
                  <option value={1}>Every 1 minute</option>
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                </select>
              </div>

              <div className="flex flex-col w-full">
                <label className="text-[var(--color-text-secondary)] font-medium text-[13px] mb-1.5">
                  Failure Threshold
                </label>
                <select
                  className="flex w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[15px] transition-colors focus-visible:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
                  value={formData.failureThreshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, failureThreshold: Number(e.target.value) }))}
                >
                  <option value={1}>1 failure</option>
                  <option value={2}>2 consecutive failures</option>
                  <option value={3}>3 consecutive failures</option>
                  <option value={5}>5 consecutive failures</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col w-full">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-brand)] focus:ring-[var(--color-focus-ring)]"
                  checked={formData.statusPageVisible}
                  onChange={(e) => setFormData(prev => ({ ...prev, statusPageVisible: e.target.checked }))}
                />
                <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                  Show on public status page
                </span>
              </label>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1 ml-7">
                If enabled, this monitor's uptime will be visible to anyone viewing your public status page.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
            <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/monitors')}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading || !formData.name || !formData.url}>
              {isLoading ? 'Creating...' : 'Create Monitor'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
