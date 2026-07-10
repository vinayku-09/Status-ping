'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Activity, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#f8f9fa] flex items-center justify-center p-4 overflow-hidden select-none">
      
      {/* ─── Exact Architectural Blueprint Grid Lines from Screenshot ─── */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        {/* Horizontal Guide Line */}
        <div className="w-full h-px border-t border-dashed border-slate-200 absolute" />
        {/* Vertical Guide Line */}
        <div className="h-full w-px border-l border-dashed border-slate-200 absolute" />
        
        {/* Outer Frame Bounds matching the screenshot's guidelines */}
        <div className="w-[440px] h-[380px] border border-dashed border-slate-200/60 absolute hidden sm:block pointer-events-none" />
      </div>

      {/* Back Navigation Trigger */}
      <div className="absolute top-8 left-8 hidden sm:block z-20">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>
      </div>

      {/* ─── Login Card Core Frame ─── */}
      <div className="relative z-10 w-full max-w-[360px] bg-transparent sm:p-2">
        
        {/* Brand Header Stack */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
            <Activity className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-semibold tracking-tight text-slate-900">
            StatusPing
          </span>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-100 animate-in fade-in-50 duration-200">
            {error}
          </div>
        )}

        {/* Form Elements Sheet */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Block */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs font-medium text-slate-600 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
            />
          </div>

          {/* Password Block */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label 
                htmlFor="password" 
                className="block text-xs font-medium text-slate-600"
              >
                Password
              </label>
              <Link 
                href="#" 
                className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
            />
          </div>

          {/* Interactive Action Trigger (Vibrant Blue Gloss Gradient) */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 flex items-center justify-center rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/10 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        {/* Footer Toggle Navigation Link */}
        <p className="mt-6 text-center text-xs text-slate-400">
          New to StatusPing?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline">
            Create account
          </Link>
        </p>

      </div>
    </div>
  );
}