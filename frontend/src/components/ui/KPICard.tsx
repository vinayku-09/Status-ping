import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

export interface KPICardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  className?: string;
}

export function KPICard({ label, value, subtext, trend, trendText, className }: KPICardProps) {
  
  const getTrendColor = () => {
    if (trend === 'up') return "text-[var(--color-up)]";
    if (trend === 'down') return "text-[var(--color-down)]";
    return "text-[var(--color-text-secondary)]";
  };

  const getTrendIcon = () => {
    if (trend === 'up') return "↑";
    if (trend === 'down') return "↓";
    return "→";
  };

  return (
    <Card className={cn("p-5 flex flex-col gap-2", className)}>
      <div className="text-mono-lg text-[36px] font-medium leading-none tracking-tight text-[var(--color-text-primary)]">
        {value}
      </div>
      <div className="text-[14px] font-semibold text-[var(--color-text-secondary)]">
        {label}
      </div>
      
      {(subtext || trendText) && (
        <div className="flex flex-col gap-1 mt-2">
          {subtext && (
            <div className="text-caption text-[var(--color-text-tertiary)]">
              {subtext}
            </div>
          )}
          {trendText && (
            <div className={cn("text-caption font-medium flex items-center gap-1", getTrendColor())}>
              {trend && <span>{getTrendIcon()}</span>}
              {trendText}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
