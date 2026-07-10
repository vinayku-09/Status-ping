import * as React from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

export interface UptimeBarData {
  date: string;
  uptimePercent: number | null; // null means no data
  incidents?: number;
}

export interface UptimeBarsProps extends React.HTMLAttributes<HTMLDivElement> {
  data: UptimeBarData[]; // Expecting exactly 90 days usually
  compact?: boolean;
}

export function UptimeBars({ data, compact = false, className, ...props }: UptimeBarsProps) {
  
  const getBarColor = (percent: number | null) => {
    if (percent === null) return "bg-[var(--color-border)]"; // No data
    if (percent >= 99.9) return "bg-[var(--color-up)]";
    if (percent >= 99.0) return "bg-[#63C87C]"; // Lighter green
    if (percent >= 95.0) return "bg-[var(--color-degraded)]";
    return "bg-[var(--color-down)]";
  };

  const getTooltipContent = (day: UptimeBarData) => {
    if (day.uptimePercent === null) {
      return `${day.date} · No data`;
    }
    const incidentText = day.incidents ? ` · ${day.incidents} incident${day.incidents > 1 ? 's' : ''}` : '';
    return `${day.date} · ${day.uptimePercent.toFixed(2)}% uptime${incidentText}`;
  };

  return (
    <div 
      className={cn(
        "flex gap-[2px] w-full",
        compact ? "h-8" : "h-12",
        className
      )} 
      {...props}
    >
      {data.map((day, i) => (
        <Tooltip key={`${day.date}-${i}`} content={getTooltipContent(day)}>
          <div 
            className={cn(
              "flex-1 min-w-[2px] h-full rounded-sm opacity-0",
              getBarColor(day.uptimePercent)
            )}
            style={{ 
              animation: `bar-rise var(--duration-lazy) var(--ease-out) ${i * 3}ms forwards`,
              transformOrigin: 'bottom'
            }}
          />
        </Tooltip>
      ))}
    </div>
  );
}
