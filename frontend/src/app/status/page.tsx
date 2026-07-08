'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { StatusPageData } from '@/lib/types';
import Navbar from '@/components/Navbar';

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
      <>
        <div className="text-center py-20 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <div className="text-center py-20 text-red-600">
          {error || 'Unable to load status page'}
        </div>
      </>
    );
  }

  const getOverallStatusStyle = () => {
    switch (data.overallStatus) {
      case 'operational': return 'bg-green-600';
      case 'degraded': return 'bg-yellow-500';
      case 'outage': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  const getOverallStatusText = () => {
    switch (data.overallStatus) {
      case 'operational': return 'All Systems Operational';
      case 'degraded': return 'Degraded Performance';
      case 'outage': return 'Major Outage';
      default: return 'Unknown Status';
    }
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Banner */}
        <div className={`rounded-lg p-6 shadow-lg mb-10 text-white ${getOverallStatusStyle()}`}>
          <h2 className="text-3xl font-bold">{getOverallStatusText()}</h2>
          <p className="mt-2 text-sm opacity-90">Last updated: {new Date().toLocaleTimeString()}</p>
        </div>

        {/* Active Incidents */}
        {data.activeIncidents.length > 0 && (
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Active Incidents</h3>
            <div className="space-y-4">
              {data.activeIncidents.map(incident => (
                <div key={incident.id} className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                  <h4 className="font-bold text-red-800">{incident.monitor.name}</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Investigating - We are currently experiencing an issue ({incident.errorType || 'Unknown Error'}).
                  </p>
                  <p className="text-xs text-red-500 mt-2">
                    Started: {new Date(incident.startedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monitors List */}
        <div>
          <h3 className="text-xl font-bold mb-4 text-gray-900">Uptime (Last 90 Days)</h3>
          <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-100">
            <ul className="divide-y divide-gray-200">
              {data.monitors.map(monitor => (
                <li key={monitor.id} className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-lg text-gray-900">{monitor.name}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                      ${monitor.status === 'down' ? 'bg-red-100 text-red-800' : 
                        monitor.status === 'degraded' ? 'bg-yellow-100 text-yellow-800' : 
                        monitor.status === 'paused' ? 'bg-gray-100 text-gray-800' :
                        'bg-green-100 text-green-800'}`}
                    >
                      {monitor.status}
                    </span>
                  </div>
                  
                  {/* Uptime bar */}
                  <div className="mt-4 flex space-x-1 h-10 w-full overflow-hidden rounded">
                    {monitor.uptime90d.map((day, idx) => {
                      let color = 'bg-gray-200'; // No data
                      if (day.uptimePercent !== null) {
                        if (day.uptimePercent >= 99) color = 'bg-green-400';
                        else if (day.uptimePercent >= 90) color = 'bg-yellow-400';
                        else color = 'bg-red-400';
                      }
                      return (
                        <div 
                          key={idx} 
                          title={`${day.date}: ${day.uptimePercent !== null ? day.uptimePercent + '%' : 'No data'}`}
                          className={`flex-1 ${color} transition-opacity hover:opacity-75 cursor-help rounded-sm`}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>90 days ago</span>
                    <span>100% uptime</span>
                    <span>Today</span>
                  </div>
                </li>
              ))}
              {data.monitors.length === 0 && (
                <li className="p-6 text-center text-gray-500">No public monitors available.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
