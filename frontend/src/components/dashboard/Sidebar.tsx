'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Activity, AlertTriangle, BarChart2, Bell, CreditCard,
  Globe, Settings2, Sparkles, Users, Search,
  LogOut, ChevronDown, ChevronRight, Menu, Hexagon
} from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  openCommandPalette: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  count?: number;
  alert?: boolean;
  badge?: string;
}

export function Sidebar({ collapsed, setCollapsed, openCommandPalette }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems: NavItem[] = [
    { name: 'Overview', href: '/dashboard', icon: Hexagon, exact: true },
    { name: 'Monitors', href: '/dashboard/monitors', icon: Activity, exact: false, count: 12 },
    { name: 'Incidents', href: '/dashboard/incidents', icon: AlertTriangle, exact: false, count: 2, alert: true },
    { name: 'Status Pages', href: '/dashboard/status-pages', icon: Globe, exact: false },
    { name: 'Alert Feeds', href: '/dashboard/notifications', icon: Bell, exact: false },
    { name: 'Analytics Hub', href: '/dashboard/analytics', icon: BarChart2, exact: false },
    { name: 'AI Insights', href: '/dashboard/ai', icon: Sparkles, exact: false, badge: 'PRO' },
  ];

  const orgItems = [
    { name: 'Engineering Team', href: '/dashboard/settings/team', icon: Users },
    { name: 'Subscription Plan', href: '/dashboard/settings/billing', icon: CreditCard },
    { name: 'System Settings', href: '/dashboard/settings', icon: Settings2 },
  ];

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href, item.exact);
    const content = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 text-[13px] font-semibold rounded-xl transition-all relative group',
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]'
        )}
      >
        {/* Active left-border indicator */}
        {active && !collapsed && (
          <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-blue-600 rounded-r-full" />
        )}

        <item.icon
          className={cn(
            'h-[18px] w-[18px] flex-shrink-0 transition-transform duration-150 group-hover:scale-105',
            active
              ? 'text-blue-600'
              : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)]'
          )}
          strokeWidth={2}
        />

        {!collapsed && (
          <>
            <span className="flex-1 truncate tracking-tight">{item.name}</span>

            {item.count !== undefined && (
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] font-bold rounded-md min-w-[18px] flex items-center justify-center border',
                  item.alert
                    ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse'
                    : 'bg-[var(--color-surface-raised)] border-[var(--color-border)] text-[var(--color-text-tertiary)]'
                )}
              >
                {item.count}
              </span>
            )}

            {item.badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider rounded bg-blue-50 border border-blue-100 text-blue-600 uppercase">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip content={item.name} position="right">
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300 z-40 sticky top-0',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Brand / Org Switcher */}
      <div className="h-[var(--topbar-height)] flex items-center px-4 border-b border-[var(--color-border)]">
        <div className="flex items-center w-full gap-2.5 cursor-pointer group">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="14" width="4" height="8" rx="1" fill="white" />
              <rect x="8" y="10" width="4" height="12" rx="1" fill="white" fillOpacity="0.85" />
              <rect x="14" y="6" width="4" height="16" rx="1" fill="white" />
              <rect x="20" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.6" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between overflow-hidden">
              <span className="font-bold text-sm tracking-tight text-[var(--color-text-primary)]">Acme Corp</span>
              <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] transition-colors" />
            </div>
          )}
        </div>
      </div>

      {/* Command Search Trigger */}
      <div className="px-3 py-4">
        <button
          onClick={openCommandPalette}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-[var(--color-text-tertiary)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-xl hover:border-blue-300 hover:bg-[var(--color-surface)] hover:text-[var(--color-text-secondary)] transition-all',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" />
            {!collapsed && <span className="font-semibold text-[var(--color-text-tertiary)]">Quick console...</span>}
          </div>
          {!collapsed && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[9px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded shadow-xs text-[var(--color-text-tertiary)]">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-6 pb-4 scrollbar-none">
        <div className="space-y-0.5">
          {navItems.map(item => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>

        {/* Settings Section */}
        <div className="space-y-0.5">
          {!collapsed && (
            <h4 className="px-3 mb-2 text-[10px] font-bold tracking-widest text-[var(--color-text-tertiary)] uppercase">
              Settings &amp; Workspace
            </h4>
          )}
          {orgItems.map(item => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--color-border)] flex flex-col gap-1 bg-[var(--color-canvas)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)] rounded-xl transition-colors w-full"
        >
          <Menu className="h-4 w-4 flex-shrink-0 text-[var(--color-text-tertiary)]" strokeWidth={2} />
          {!collapsed && <span>Collapse workspace</span>}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-1.5 mt-0.5 border border-emerald-100 bg-emerald-50 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
            <span className="text-[11px] font-semibold text-emerald-700 tracking-tight">Telemetry Agent Active</span>
          </div>
        )}

        {/* User Card */}
        <div className="flex items-center gap-2.5 mt-2 hover:bg-[var(--color-surface-raised)] border border-transparent hover:border-[var(--color-border)] p-2 rounded-xl transition-all">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden flex items-center justify-between min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[var(--color-text-primary)] truncate tracking-tight">
                  {user?.name || 'Operator'}
                </span>
                <span className="text-[10px] font-medium text-[var(--color-text-tertiary)] truncate">
                  {user?.email}
                </span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0 pl-0.5" />
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-1',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" strokeWidth={2} />
          {!collapsed && <span>Disconnect Session</span>}
        </button>
      </div>
    </div>
  );
}