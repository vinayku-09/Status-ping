import * as React from "react";
import { cn } from "@/lib/utils";
import { MonitorStatus } from "@/lib/types";

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: MonitorStatus | 'operational' | 'outage';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusDot({ status, size = 'md', className, ...props }: StatusDotProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4"
  };

  const statusConfig = {
    active: { dot: "bg-[var(--color-up)]", animate: true, shadow: "shadow-[var(--shadow-glow-up)]" },
    operational: { dot: "bg-[var(--color-up)]", animate: true, shadow: "shadow-[var(--shadow-glow-up)]" },
    down: { dot: "bg-[var(--color-down)]", animate: false, shadow: "shadow-[var(--shadow-glow-down)]" },
    outage: { dot: "bg-[var(--color-down)]", animate: false, shadow: "shadow-[var(--shadow-glow-down)]" },
    degraded: { dot: "bg-[var(--color-degraded)]", animate: true, shadow: "shadow-[var(--shadow-glow-degraded)]" },
    pending: { dot: "bg-[var(--color-pending)]", animate: false, shadow: "shadow-none" },
    paused: { dot: "bg-[var(--color-paused)]", animate: false, shadow: "shadow-none" }
  };

  const config = statusConfig[status] || statusConfig.paused;

  return (
    <span className="relative flex items-center justify-center" {...props}>
      {config.animate && (
        <span className={cn(
          "absolute rounded-full opacity-50",
          sizeClasses[size],
          config.dot,
          "animate-[status-pulse_2.5s_ease-in-out_infinite]"
        )} />
      )}
      <span className={cn(
        "relative rounded-full",
        sizeClasses[size],
        config.dot,
        config.shadow,
        className
      )} />
    </span>
  );
}
