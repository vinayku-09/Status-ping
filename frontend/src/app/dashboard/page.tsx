'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/apiClient';
import { MonitorListItem } from '@/lib/types';

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<MonitorListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    fetchMonitors();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'down': return 'bg-red-100 text-red-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'paused': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading monitors...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-10">{error}</div>;
  }

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Monitors
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            A list of all your monitored services.
          </p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Link
            href="/dashboard/monitors/new"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Create Monitor
          </Link>
        </div>
      </div>

      {monitors.length === 0 ? (
        <div className="text-center bg-white rounded-lg shadow py-12">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No monitors</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new monitor.</p>
          <div className="mt-6">
            <Link
              href="/dashboard/monitors/new"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              New Monitor
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">30d Uptime</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Interval</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">View</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monitors.map((monitor) => (
                <tr key={monitor.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {monitor.name}
                    <div className="text-gray-500 font-normal text-xs">{monitor.url}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(monitor.status)}`}>
                      {monitor.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {monitor.uptimePercent30d !== null ? `${monitor.uptimePercent30d}%` : 'N/A'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {monitor.checkIntervalMinutes}m
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <Link href={`/dashboard/monitors/${monitor.id}`} className="text-indigo-600 hover:text-indigo-900">
                      View<span className="sr-only">, {monitor.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
