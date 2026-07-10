'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Activity, AlertTriangle, Settings2, Globe, Command, Hexagon, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commands = [
    { id: '1', title: 'api.acme.com', icon: Activity, group: 'Monitors', action: () => router.push('/dashboard/monitors/1') },
    { id: '2', title: 'payments.example.co', icon: Activity, group: 'Monitors', action: () => router.push('/dashboard/monitors/2') },
    { id: '3', title: 'Incident #47', icon: AlertTriangle, group: 'Recent Outages', action: () => router.push('/dashboard/incidents/47') },
    { id: '4', title: 'Create new monitor', icon: Activity, group: 'Actions', action: () => router.push('/dashboard/monitors/new') },
    { id: '5', title: 'Go to Overview', icon: Hexagon, group: 'Navigation', action: () => router.push('/dashboard') },
    { id: '6', title: 'Open Settings', icon: Settings2, group: 'Navigation', action: () => router.push('/dashboard/settings') },
    { id: '7', title: 'View Public Status Page', icon: Globe, group: 'Navigation', action: () => window.open('/status', '_blank') },
  ];

  const filteredCommands = query 
    ? commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Group commands dynamically
  const groups = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {} as Record<string, typeof commands>);

  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      setQuery('');
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? onClose() : document.dispatchEvent(new CustomEvent('open-command-palette'));
      }
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      }
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh]">
      {/* Light Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[4px] transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Command Box Surface */}
      <div className="relative w-full max-w-[560px] mx-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[480px]">
        {/* Search Header Input Frame */}
        <div className="flex items-center px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] h-14 shrink-0">
          <Search className="h-[18px] w-[18px] text-[var(--color-text-tertiary)]" />
          <input
            ref={inputRef}
            className="flex-1 h-full bg-transparent border-0 px-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none font-medium"
            placeholder="Search commands, metrics, status logs..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-[#f8fbff] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded-md shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Dynamic Interactive List Stream */}
        <div className="flex-1 overflow-y-auto p-2 scrollbar-none space-y-3">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-sm font-medium text-[var(--color-text-secondary)]">
              No matching records found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="space-y-0.5">
                <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  {group}
                </div>
                {items.map((item) => {
                  const flatIndex = filteredCommands.findIndex(c => c.id === item.id);
                  const isSelected = flatIndex === selectedIndex;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        item.action();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left",
                        isSelected 
                          ? "bg-[var(--color-brand-subtle)] text-blue-600 shadow-sm" 
                          : "text-[var(--color-text-primary)] hover:bg-[#f8fbff]"
                      )}
                    >
                      <item.icon 
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors", 
                          isSelected ? "text-blue-600" : "text-[var(--color-text-tertiary)]"
                        )} 
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-blue-500/80 inline-flex items-center gap-0.5 animate-fade-in">
                          <span>Select</span>
                          <CornerDownLeft className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Navigation Hotkeys Status Footer */}
        <div className="bg-[#f8fbff] px-4 py-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] font-medium text-[var(--color-text-tertiary)] shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--color-surface)] px-1 py-0.5 rounded border border-[var(--color-border)] text-[9px] shadow-sm">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-[var(--color-surface)] px-1 py-0.5 rounded border border-[var(--color-border)] text-[9px] shadow-sm">Enter</kbd> Execute
            </span>
          </div>
          <span className="text-[10px] opacity-75 font-mono">Global Console v1.2</span>
        </div>
      </div>
    </div>
  );
}