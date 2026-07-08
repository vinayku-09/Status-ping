'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { NotificationConfig, MonitorListItem } from '@/lib/types';
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
      } catch (err: any) {
        setError(err.message || 'Failed to fetch monitors');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMonitors();
  }, []);

  if (isLoading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage notifications for all your monitors. Click a monitor to manage its notifications.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {monitors.map((monitor) => (
            <li key={monitor.id} className="p-4 hover:bg-gray-50">
              <Link href={`/dashboard/monitors/${monitor.id}`} className="block">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-indigo-600">{monitor.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{monitor.url}</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      Manage →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {monitors.length === 0 && (
            <li className="p-4 text-center text-sm text-gray-500">
              No monitors found. Create a monitor first.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
