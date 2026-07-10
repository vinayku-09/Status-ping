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
    { name: 'Alerts', href: '/dashboard/notifications', icon: Bell, exact: false },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2, exact: false },
    { name: 'AI Insights', href: '/dashboard/ai', icon: Sparkles, exact: false, badge: 'NEW' },
  ];

  const orgItems = [
    { name: 'Team', href: '/dashboard/settings/team', icon: Users },
    { name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings2 },
  ];

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href, item.exact);
    const content = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 text-[14px] font-medium rounded-[var(--radius-md)] transition-colors relative",
          active 
            ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand-text)]" 
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)]"
        )}
      >
        {active && !collapsed && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--color-brand)] rounded-r-full" />
        )}
        <item.icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.5} />
        
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.name}</span>
            {item.count !== undefined && (
              <span className={cn(
                "px-2 py-0.5 text-[11px] font-semibold rounded-full min-w-[18px] flex items-center justify-center",
                item.alert 
                  ? "bg-[var(--color-down-subtle)] text-[var(--color-down-text)]" 
                  : "bg-[var(--color-border)] text-[var(--color-text-secondary)]"
              )}>
                {item.count}
              </span>
            )}
            {item.badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wide rounded bg-[var(--color-brand-subtle)] text-[var(--color-brand)] uppercase">
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
        "flex flex-col h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all duration-300 z-40 sticky top-0",
        collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Header / Org Switcher */}
      <div className="h-[var(--topbar-height)] flex items-center px-4 border-b border-[var(--color-border)]">
        <div className="flex items-center w-full gap-2 cursor-pointer group">
          <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-brand)] rounded-[var(--radius-md)] flex items-center justify-center shadow-[var(--shadow-glow-brand)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="14" width="4" height="8" rx="1" fill="white" />
              <rect x="8" y="10" width="4" height="12" rx="1" fill="white" fillOpacity="0.8" />
              <rect x="14" y="6" width="4" height="16" rx="1" fill="white" />
              <rect x="20" y="12" width="4" height="10" rx="1" fill="white" fillOpacity="0.5" />
            </svg>
          </div>
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between overflow-hidden">
              <span className="font-semibold text-[15px] truncate text-[var(--color-text-primary)]">Acme Corp</span>
              <ChevronDown className="h-4 w-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] transition-colors" />
            </div>
          )}
        </div>
      </div>

      {/* Command Palette Trigger */}
      <div className="px-3 py-4">
        <button
          onClick={openCommandPalette}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[var(--color-text-tertiary)] bg-[var(--color-canvas)] border border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-secondary)] transition-all shadow-[var(--shadow-xs)]",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Search...</span>}
          </div>
          {!collapsed && (
            <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 rounded shadow-sm">
              <span className="text-[12px]">⌘</span>K
            </kbd>
          )}
        </button>
      </div>

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-6 pb-4 scrollbar-thin">
        <div className="space-y-1">
          {navItems.map(item => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>

        <div className="space-y-1">
          {!collapsed && (
            <h4 className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-[var(--color-text-tertiary)] uppercase">
              Organization
            </h4>
          )}
          {orgItems.map(item => (
            <NavLink key={item.name} item={item} />
          ))}
        </div>
      </div>

      {/* Footer / User */}
      <div className="p-3 border-t border-[var(--color-border)] flex flex-col gap-2">
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2 text-[13px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)] rounded-[var(--radius-md)] transition-colors"
        >
          <Menu className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && <span>Collapse sidebar</span>}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-[var(--color-up)] animate-pulse shadow-[var(--shadow-glow-up)]" />
            <span className="text-[11px] text-[var(--color-text-secondary)]">API healthy</span>
          </div>
        )}

        <div className="flex items-center gap-3 mt-1 cursor-pointer hover:bg-[var(--color-surface-raised)] p-2 rounded-[var(--radius-md)] transition-colors">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[var(--color-brand)] to-[var(--color-chart-4)] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[13px] font-medium truncate text-[var(--color-text-primary)]">{user?.name || 'User'}</span>
                <span className="text-[11px] text-[var(--color-text-tertiary)] truncate">{user?.email}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-down-subtle)] hover:text-[var(--color-down-text)] rounded-[var(--radius-md)] transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.5} />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );
}
