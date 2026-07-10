'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, HelpCircle, Plus, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '@/hooks/useAuth';

export function Topbar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(p => p !== '');
    if (paths.length <= 1) return null; // Just /dashboard
    
    // Skip 'dashboard' in display
    const crumbs = paths.slice(1).map((path, i, arr) => {
      const isLast = i === arr.length - 1;
      const title = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      
      return (
        <React.Fragment key={path}>
          {i > 0 && <span className="text-[var(--color-text-tertiary)] mx-2">/</span>}
          {isLast ? (
            <span className="text-[var(--color-text-primary)] font-medium text-[13px]">{title}</span>
          ) : (
            <span className="text-[var(--color-text-secondary)] text-[13px]">{title}</span>
          )}
        </React.Fragment>
      );
    });
    
    return <div className="flex items-center">{crumbs}</div>;
  };

  return (
    <header className="h-[var(--topbar-height)] sticky top-0 z-30 flex items-center justify-between px-6 bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
      
      {/* Left: Breadcrumbs */}
      <div className="flex-1 flex items-center">
        {generateBreadcrumbs()}
      </div>
      
      {/* Center: Contextual Status (mocked for now) */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        {pathname.includes('/monitors/') && pathname.split('/').length > 3 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[var(--color-up-subtle)] border border-[var(--color-up)]/20 rounded-full">
            <span className="h-2 w-2 rounded-full bg-[var(--color-up)] animate-[status-pulse_2.5s_ease-in-out_infinite]" />
            <span className="text-[12px] font-medium text-[var(--color-up-text)]">api.example.com is Operational</span>
          </div>
        )}
      </div>
      
      {/* Right: Actions */}
      <div className="flex-1 flex items-center justify-end gap-4">
        <button className="relative p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] rounded-full transition-colors">
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[var(--color-down)] rounded-full border-2 border-[var(--color-surface)]" />
        </button>
        
        <button className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] rounded-full transition-colors hidden sm:block">
          <HelpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>

        <button
          onClick={logout}
          title="Log out"
          className="p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-down-subtle)] hover:text-[var(--color-down-text)] rounded-full transition-colors"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        
        <div className="h-6 w-px bg-[var(--color-border)] hidden sm:block mx-1" />
        
        <Link href="/dashboard/monitors/new">
          <Button variant="primary" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Monitor</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
