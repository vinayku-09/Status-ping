'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, Activity, AlertTriangle, Settings2, Globe, Command, Hexagon } from 'lucide-react';
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
    { id: '3', title: 'Incident #47', icon: AlertTriangle, group: 'Recent', action: () => router.push('/dashboard/incidents/47') },
    { id: '4', title: 'Create new monitor', icon: Activity, group: 'Actions', action: () => router.push('/dashboard/monitors/new') },
    { id: '5', title: 'Go to Overview', icon: Hexagon, group: 'Navigation', action: () => router.push('/dashboard') },
    { id: '6', title: 'Open Settings', icon: Settings2, group: 'Navigation', action: () => router.push('/dashboard/settings') },
    { id: '7', title: 'View Public Status', icon: Globe, group: 'Navigation', action: () => window.open('/status', '_blank') },
  ];

  const filteredCommands = query 
    ? commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Group commands
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      <div 
        className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-[4px] animate-[fade-in_var(--duration-fast)_var(--ease-out)]"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-[600px] mx-4 bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] border border-[var(--color-border)] overflow-hidden animate-[fade-in-down_var(--duration-normal)_var(--ease-out)]">
        <div className="flex items-center px-4 border-b border-[var(--color-border)]">
          <Search className="h-5 w-5 text-[var(--color-text-tertiary)]" />
          <input
            ref={inputRef}
            className="flex-1 h-14 bg-transparent border-0 px-4 text-[16px] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none"
            placeholder="Search or type a command..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border border-[var(--color-border-strong)] px-1.5 py-0.5 rounded shadow-sm">
            ESC
          </kbd>
        </div>

        <div className="max-h-[360px] overflow-y-auto p-2 scrollbar-thin">
          {filteredCommands.length === 0 ? (
            <div className="py-14 text-center text-[14px] text-[var(--color-text-secondary)]">
              No results found for "{query}"
            </div>
          ) : (
            Object.entries(groups).map(([group, items], groupIndex) => (
              <div key={group} className="mb-4 last:mb-0">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider">
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
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[14px] transition-colors text-left",
                        isSelected 
                          ? "bg-[var(--color-brand-subtle)] text-[var(--color-brand-text)]" 
                          : "text-[var(--color-text-primary)]"
                      )}
                    >
                      <item.icon 
                        className={cn(
                          "h-4 w-4", 
                          isSelected ? "text-[var(--color-brand)]" : "text-[var(--color-text-tertiary)]"
                        )} 
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {isSelected && (
                        <Command className="h-3 w-3 text-[var(--color-brand)]/50" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
