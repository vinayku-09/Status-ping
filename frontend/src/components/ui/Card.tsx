import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, clickable = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          clickable && "cursor-pointer hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-md)] active:translate-y-px active:shadow-[var(--shadow-xs)]",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export { Card };
