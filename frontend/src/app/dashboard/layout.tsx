'use client';

import * as React from 'react';
import AuthGuard from '@/components/AuthGuard';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Topbar } from '@/components/dashboard/Topbar';
import { CommandPalette } from '@/components/dashboard/CommandPalette';
import { cn } from '@/lib/utils';

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
      <div className="flex h-screen w-full bg-[var(--color-canvas)] overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar 
          collapsed={collapsed} 
          setCollapsed={setCollapsed} 
          openCommandPalette={() => setIsCommandPaletteOpen(true)} 
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Topbar />
          
          <main className="flex-1 overflow-y-auto focus:outline-none">
            <div className="w-full max-w-[var(--page-max-width)] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-[fade-in_var(--duration-normal)_var(--ease-out)]">
              {children}
            </div>
          </main>
        </div>
        
        {/* Command Palette Overlay */}
        <CommandPalette 
          isOpen={isCommandPaletteOpen} 
          onClose={() => setIsCommandPaletteOpen(false)} 
        />
        
      </div>
    </AuthGuard>
  );
}
