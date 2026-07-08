'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { MonitorDetail, PingLog, Incident, NotificationConfig } from '@/lib/types';
import Link from 'next/link';

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const monitorId = params.id as string;

  const [detail, setDetail] = useState<MonitorDetail | null>(null);
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states for notification
  const [notifType, setNotifType] = useState<'email' | 'webhook'>('email');
  const [notifEmail, setNotifEmail] = useState('');
  const [notifWebhook, setNotifWebhook] = useState('');
  const [notifSecret, setNotifSecret] = useState(''); // for newly created webhooks

  const fetchData = async () => {
    try {
      const [detailRes, notifRes] = await Promise.all([
        api.getMonitor(monitorId),
        api.getNotifications(monitorId)
      ]);
      setDetail(detailRes.data);
      setNotifications(notifRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch monitor details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monitorId]);

  const togglePause = async () => {
    if (!detail) return;
    try {
      const newStatus = detail.monitor.status === 'paused' ? 'active' : 'paused';
      await api.updateMonitor(monitorId, { status: newStatus });
      fetchData(); // refresh
    } catch (err: any) {
      alert(err.message || 'Failed to update monitor');
    }
  };

  const deleteMonitor = async () => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await api.deleteMonitor(monitorId, true); // force delete
      router.push('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Failed to delete monitor');
    }
  };

  const addNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSecret('');
    try {
      const body = notifType === 'email' 
        ? { type: 'email' as const, email: notifEmail }
        : { type: 'webhook' as const, webhookUrl: notifWebhook };
      
      const res = await api.createNotification(monitorId, body);
      if (res.meta?.webhookSecret) {
        setNotifSecret(res.meta.webhookSecret);
      }
      setNotifEmail('');
      setNotifWebhook('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add notification');
    }
  };

  const removeNotification = async (configId: string) => {
    if (!confirm('Remove this notification?')) return;
    try {
      await api.deleteNotification(monitorId, configId);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete notification');
    }
  };

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (error || !detail) return <div className="text-red-500 text-center py-10">{error || 'Not found'}</div>;

  const { monitor, pingLogs, openIncident, latestSslCheck, stats } = detail;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold leading-6 text-gray-900">{monitor.name}</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <a href={monitor.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{monitor.url}</a>
              <div className="mt-1">
                Status: <span className="font-bold">{monitor.status}</span> | 
                Interval: {monitor.checkIntervalMinutes}m | 
                Threshold: {monitor.failureThreshold} | 
                Timeout: {monitor.timeoutSeconds}s
              </div>
              <div className="mt-1">
                30d Uptime: {stats.uptimePercent30d !== null ? `${stats.uptimePercent30d}%` : 'N/A'} | 
                P95 Response: {stats.p95ResponseTimeMs !== null ? `${stats.p95ResponseTimeMs}ms` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={togglePause}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {monitor.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={deleteMonitor}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Incidents */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Open Incident</h3>
          {openIncident ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    Incident started at {new Date(openIncident.startedAt).toLocaleString()} ({openIncident.errorType})
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No open incidents.</p>
          )}
        </div>
      </div>

      {/* SSL Check */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Latest SSL Check</h3>
          {latestSslCheck ? (
            <div className="text-sm text-gray-500">
              <p>Valid: {latestSslCheck.isValid ? 'Yes' : 'No'}</p>
              {latestSslCheck.issuer && <p>Issuer: {latestSslCheck.issuer}</p>}
              {latestSslCheck.daysRemaining !== null && <p>Days Remaining: {latestSslCheck.daysRemaining}</p>}
              {latestSslCheck.errorMessage && <p className="text-red-500">Error: {latestSslCheck.errorMessage}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No SSL data available.</p>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Notifications</h3>
          
          {notifSecret && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-sm text-yellow-700 font-bold">Webhook Secret (Save this now!)</p>
              <p className="text-xs text-yellow-600 mt-1 font-mono break-all">{notifSecret}</p>
            </div>
          )}

          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md mb-6">
            {notifications.map(notif => (
              <li key={notif.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                <div className="w-0 flex-1 flex items-center">
                  <span className="ml-2 flex-1 w-0 truncate">
                    <span className="font-semibold uppercase text-xs mr-2">{notif.type}</span>
                    {notif.type === 'email' ? notif.email : notif.webhookUrl}
                  </span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button onClick={() => removeNotification(notif.id)} className="font-medium text-red-600 hover:text-red-500">
                    Remove
                  </button>
                </div>
              </li>
            ))}
            {notifications.length === 0 && (
              <li className="pl-3 pr-4 py-3 text-sm text-gray-500">No notifications configured.</li>
            )}
          </ul>

          <form onSubmit={addNotification} className="flex gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <select 
                value={notifType} 
                onChange={(e) => setNotifType(e.target.value as any)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm ring-1 ring-inset ring-gray-300"
              >
                <option value="email">Email</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700">Destination</label>
              {notifType === 'email' ? (
                <input 
                  type="email" 
                  required 
                  value={notifEmail} 
                  onChange={e => setNotifEmail(e.target.value)} 
                  placeholder="alert@example.com"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
                />
              ) : (
                <input 
                  type="url" 
                  required 
                  value={notifWebhook} 
                  onChange={e => setNotifWebhook(e.target.value)} 
                  placeholder="https://example.com/webhook"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 ring-1 ring-inset ring-gray-300"
                />
              )}
            </div>
            <button type="submit" className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
              Add
            </button>
          </form>
        </div>
      </div>

      {/* Ping Logs */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Recent Pings (Last 20)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-2 text-left text-sm font-semibold text-gray-900">Time</th>
                  <th className="py-2 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="py-2 text-left text-sm font-semibold text-gray-900">Code</th>
                  <th className="py-2 text-left text-sm font-semibold text-gray-900">Response (ms)</th>
                  <th className="py-2 text-left text-sm font-semibold text-gray-900">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pingLogs.map(log => (
                  <tr key={log.id}>
                    <td className="py-2 text-sm text-gray-500">{new Date(log.checkedAt).toLocaleString()}</td>
                    <td className="py-2 text-sm">
                      {log.isUp ? (
                        <span className="text-green-600 font-medium">UP</span>
                      ) : (
                        <span className="text-red-600 font-medium">DOWN</span>
                      )}
                    </td>
                    <td className="py-2 text-sm text-gray-500">{log.statusCode || '-'}</td>
                    <td className="py-2 text-sm text-gray-500">{log.responseTimeMs || '-'}</td>
                    <td className="py-2 text-sm text-red-500">{log.errorType || '-'}</td>
                  </tr>
                ))}
                {pingLogs.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-sm text-gray-500">No pings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
