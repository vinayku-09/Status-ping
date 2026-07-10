import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, errorText, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const hasError = !!errorText;

    return (
      <div className="flex flex-col w-full">
        {label && (
          <label 
            htmlFor={inputId} 
            className="text-[var(--color-text-secondary)] font-medium text-[13px] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "flex w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-[15px] transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-[var(--color-text-tertiary)]",
            "focus-visible:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError ? "border-[var(--color-down)]" : "border-[var(--color-border)]",
            className
          )}
          {...props}
        />
        {(errorText || helperText) && (
          <p className={cn(
            "text-[11px] mt-1",
            hasError ? "text-[var(--color-down)]" : "text-[var(--color-text-tertiary)]"
          )}>
            {errorText || helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
