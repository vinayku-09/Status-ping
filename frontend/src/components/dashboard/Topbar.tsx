'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, HelpCircle, Plus, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function Topbar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  // Generate high-contrast functional breadcrumbs
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(p => p !== '');
    if (paths.length <= 1) return <span className="text-[13px] font-bold text-[var(--color-text-primary)] tracking-tight">Workspace Root</span>;
    
    const crumbs = paths.slice(1).map((path, i, arr) => {
      const isLast = i === arr.length - 1;
      const title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      
      return (
        <React.Fragment key={path}>
          {i > 0 && <span className="text-[var(--color-text-tertiary)] mx-2 font-light text-xs">/</span>}
          {isLast ? (
            <span className="text-[var(--color-text-primary)] font-bold text-[13px] tracking-tight">{title}</span>
          ) : (
            <span className="text-[var(--color-text-secondary)] font-semibold text-[13px] tracking-tight">{title}</span>
          )}
        </React.Fragment>
      );
    });
    
    return <div className="flex items-center">{crumbs}</div>;
  };

  return (
    /* FIXED: Removed /80 opacity modifier and backdrop-blur to ensure a 100% solid white surface */
    /* Force absolute solid native Tailwind white, discarding all variables */
<header className="h-[var(--topbar-height)] sticky top-0 z-30 flex items-center justify-between px-6 bg-white border-b border-slate-200 shadow-xs">
      
      {/* Left Boundary: Navigation Context Breadcrumb Engine */}
      <div className="flex-1 flex items-center min-w-0">
        {generateBreadcrumbs()}
      </div>
      
      {/* Center Boundary: Real-Time Active Infrastructure Health State */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        {pathname.includes('/monitors') && (
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full shadow-xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-emerald-700 tracking-tight">All Operations Normal</span>
          </div>
        )}
      </div>
      
      {/* Right Boundary: Contextual Action Group Matrix */}
      <div className="flex-1 flex items-center justify-end gap-3">
        {/* Alerts Center Feed Trigger */}
        <button className="relative p-2 text-[var(--color-text-secondary)] hover:bg-[#f8fbff] hover:text-[var(--color-text-primary)] border border-transparent hover:border-[var(--color-border)] rounded-xl transition-all shadow-xs group">
          <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" strokeWidth={2} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-rose-500 rounded-full border border-[var(--color-surface)] shadow-xs" />
        </button>
        
        {/* Support Documentation Trigger */}
        <button className="p-2 text-[var(--color-text-secondary)] hover:bg-[#f8fbff] hover:text-[var(--color-text-primary)] border border-transparent hover:border-[var(--color-border)] rounded-xl transition-all shadow-xs hidden sm:block">
          <HelpCircle className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Global Exit Session Gate */}
        <button
          onClick={logout}
          title="Disconnect operational session"
          className="p-2 text-[var(--color-text-secondary)] hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-100 rounded-xl transition-all shadow-xs"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
        </button>
        
        <div className="h-5 w-px bg-[var(--color-border)] hidden sm:block mx-0.5" />
        
        {/* Primary Command Trigger */}
        <Link href="/dashboard/monitors/new">
          <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 h-9 rounded-xl shadow-sm border border-blue-500/10 flex items-center gap-1.5 tracking-tight px-3.5">
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">Add Monitor</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}