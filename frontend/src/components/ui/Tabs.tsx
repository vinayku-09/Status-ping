'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeId, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex space-x-6 border-b border-[var(--color-border)] w-full", className)}>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "pb-3 pt-1 text-sm font-medium transition-colors relative whitespace-nowrap",
              isActive 
                ? "text-[var(--color-brand)]" 
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand)] rounded-t-full animate-[underline-slide_var(--duration-fast)_var(--ease-out)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}
