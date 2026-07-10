'use client';

import * as React from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CommandPalette } from '@/components/dashboard/CommandPalette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  React.useEffect(() => {
    const handleOpenCmd = () => setIsCommandPaletteOpen(true);
    document.addEventListener('open-command-palette', handleOpenCmd);
    return () => document.removeEventListener('open-command-palette', handleOpenCmd);
  }, []);

  return (
    <AuthGuard>
      {/* Use design tokens — no hardcoded bg-slate-50 */}
      <div className="flex h-screen w-full bg-[var(--color-canvas)] overflow-hidden">

        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          openCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {/* Right column: topbar + scrollable content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[var(--color-canvas)]">

          <Topbar />

          <main className="flex-1 overflow-y-auto focus:outline-none bg-[var(--color-canvas)]">
            <div className="w-full max-w-[var(--page-max-width)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>

        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </AuthGuard>
  );
}