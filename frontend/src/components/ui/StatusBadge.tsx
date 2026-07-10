import * as React from "react";
import { cn } from "@/lib/utils";
import { MonitorStatus } from "@/lib/types";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: MonitorStatus | 'operational' | 'outage';
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none";
    
    const statusConfig = {
      active: {
        wrapper: "bg-[var(--color-up-subtle)] text-[var(--color-up-text)] border border-[var(--color-up)]/20",
        dot: "bg-[var(--color-up)]",
        animate: true,
        label: "Operational"
      },
      operational: {
        wrapper: "bg-[var(--color-up-subtle)] text-[var(--color-up-text)] border border-[var(--color-up)]/20",
        dot: "bg-[var(--color-up)]",
        animate: true,
        label: "Operational"
      },
      down: {
        wrapper: "bg-[var(--color-down-subtle)] text-[var(--color-down-text)] border border-[var(--color-down)]/20",
        dot: "bg-[var(--color-down)]",
        animate: false,
        label: "Down"
      },
      outage: {
        wrapper: "bg-[var(--color-down-subtle)] text-[var(--color-down-text)] border border-[var(--color-down)]/20",
        dot: "bg-[var(--color-down)]",
        animate: false,
        label: "Outage"
      },
      degraded: {
        wrapper: "bg-[var(--color-degraded-subtle)] text-[var(--color-degraded-text)] border border-[var(--color-degraded)]/20",
        dot: "bg-[var(--color-degraded)]",
        animate: true,
        label: "Degraded"
      },
      pending: {
        wrapper: "bg-[var(--color-pending-subtle)] text-[var(--color-pending-text)] border border-[var(--color-pending)]/20",
        dot: "bg-[var(--color-pending)]",
        animate: false, // We'll use a specific spinner instead of pulsing dot
        label: "Pending"
      },
      paused: {
        wrapper: "bg-[var(--color-paused-subtle)] text-[var(--color-paused-text)] border border-[var(--color-paused)]/20",
        dot: "bg-[var(--color-paused)]",
        animate: false,
        label: "Paused"
      }
    };

    const config = statusConfig[status] || statusConfig.paused;

    return (
      <span
        ref={ref}
        className={cn(baseStyles, config.wrapper, className)}
        {...props}
      >
        {status === 'pending' ? (
          <svg className="animate-spin h-2 w-2 text-[var(--color-pending)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <span className="relative flex h-2 w-2">
            {config.animate && (
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.dot)}></span>
            )}
            <span className={cn("relative inline-flex rounded-full h-2 w-2", config.dot)}></span>
          </span>
        )}
        {config.label}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge };
