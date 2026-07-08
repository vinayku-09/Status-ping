'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { HealthResponse } from '@/lib/types';

export default function HealthBadge() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.getHealth();
        setHealth(res);
        setError(false);
      } catch (err) {
        setError(true);
        setHealth(null);
      }
    };

    fetchHealth();
    
    // Poll every 60 seconds
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  if (error || !health) {
    return (
      <div className="flex items-center space-x-1" title="API Unavailable">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
        <span className="text-xs text-gray-500 hidden sm:inline-block">API Down</span>
      </div>
    );
  }

  const getStatusColor = () => {
    switch (health.status) {
      case 'ok': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div 
      className="flex items-center space-x-1" 
      title={`API: ${health.status}\nPostgres: ${health.postgres}\nRedis: ${health.redis}`}
    >
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
      <span className="text-xs text-gray-500 hidden sm:inline-block capitalize">
        API {health.status}
      </span>
    </div>
  );
}
