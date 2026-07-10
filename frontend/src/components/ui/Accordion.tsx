'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = React.useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className={cn("w-full divide-y divide-[var(--color-border)]", className)}>
      {items.map((item) => (
        <div key={item.id} className="py-2">
          <button
            onClick={() => toggleItem(item.id)}
            className="flex w-full items-center justify-between py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded-md"
          >
            <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">
              {item.title}
            </span>
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-[var(--color-text-tertiary)] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-out)]",
                openIds.has(item.id) && "transform rotate-180"
              )} 
            />
          </button>
          
          <div 
            className={cn(
              "overflow-hidden transition-all duration-[var(--duration-normal)] ease-[var(--ease-out)]",
              openIds.has(item.id) ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="pb-4 pt-0 text-[15px] text-[var(--color-text-secondary)]">
              {item.content}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
