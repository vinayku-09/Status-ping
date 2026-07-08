'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/apiClient';
import { CheckInterval } from '@/lib/types';
import Link from 'next/link';

export default function CreateMonitorPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    checkIntervalMinutes: 5 as CheckInterval,
    failureThreshold: 2,
    timeoutSeconds: 10,
    keywordCheck: '',
    statusPageVisible: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: target.checked }));
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.createMonitor({
        ...formData,
        keywordCheck: formData.keywordCheck || undefined,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create monitor');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Create Monitor
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            
            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                Name
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                  placeholder="My Production API"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label htmlFor="url" className="block text-sm font-medium leading-6 text-gray-900">
                URL
              </label>
              <div className="mt-2">
                <input
                  type="url"
                  name="url"
                  id="url"
                  required
                  value={formData.url}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                  placeholder="https://api.example.com/health"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="checkIntervalMinutes" className="block text-sm font-medium leading-6 text-gray-900">
                Check Interval (minutes)
              </label>
              <div className="mt-2">
                <select
                  id="checkIntervalMinutes"
                  name="checkIntervalMinutes"
                  value={formData.checkIntervalMinutes}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6 px-3"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="failureThreshold" className="block text-sm font-medium leading-6 text-gray-900">
                Failure Threshold (1-5)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="failureThreshold"
                  id="failureThreshold"
                  min="1"
                  max="5"
                  value={formData.failureThreshold}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6 px-3"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Failures required before triggering an incident</p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="timeoutSeconds" className="block text-sm font-medium leading-6 text-gray-900">
                Timeout (seconds, 5-30)
              </label>
              <div className="mt-2">
                <input
                  type="number"
                  name="timeoutSeconds"
                  id="timeoutSeconds"
                  min="5"
                  max="30"
                  value={formData.timeoutSeconds}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6 px-3"
                />
              </div>
            </div>

            <div className="col-span-full">
              <label htmlFor="keywordCheck" className="block text-sm font-medium leading-6 text-gray-900">
                Keyword Match (optional)
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="keywordCheck"
                  id="keywordCheck"
                  value={formData.keywordCheck}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                  placeholder="e.g. 'status: ok'"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Response body must contain this string to be considered UP</p>
            </div>

            <div className="col-span-full">
              <div className="relative flex gap-x-3">
                <div className="flex h-6 items-center">
                  <input
                    id="statusPageVisible"
                    name="statusPageVisible"
                    type="checkbox"
                    checked={formData.statusPageVisible}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </div>
                <div className="text-sm leading-6">
                  <label htmlFor="statusPageVisible" className="font-medium text-gray-900">
                    Visible on Status Page
                  </label>
                  <p className="text-gray-500">Make this monitor visible on your public status page.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-50 border-t border-red-200 text-red-600 sm:px-6">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-x-6 border-t border-gray-900/10 px-4 py-4 sm:px-8">
          <Link href="/dashboard" className="text-sm font-semibold leading-6 text-gray-900">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Save Monitor'}
          </button>
        </div>
      </form>
    </div>
  );
}
