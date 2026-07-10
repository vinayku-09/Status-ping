import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-40 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] border-none shadow-sm",
      secondary: "bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] shadow-[var(--shadow-xs)]",
      ghost: "bg-transparent text-[var(--color-text-secondary)] border-none hover:bg-[var(--color-surface-raised)]",
      danger: "bg-[var(--color-down)] text-white hover:brightness-90 border-none shadow-sm",
      link: "bg-transparent text-[var(--color-brand)] underline-offset-4 hover:underline border-none p-0 h-auto",
    };
    
    const sizes = {
      sm: "px-3 py-2 text-sm rounded-[var(--radius-md)]",
      md: "px-4 py-2.5 text-sm rounded-[var(--radius-md)]",
      lg: "px-6 py-3 text-base rounded-[var(--radius-lg)]",
      icon: "p-2 w-9 h-9 rounded-[var(--radius-md)]",
      link: "",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          variant === 'link' ? sizes.link : sizes[size],
          className
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
