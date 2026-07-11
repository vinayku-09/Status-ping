'use client';

import * as React from "react";

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  onDismiss: (id: string) => void;
}

export function Toast({ id, title, message, type = 'info', onDismiss }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const icons = {
    success: (
      <svg className="w-5 h-5 text-[var(--color-up)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-[var(--color-down)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-[var(--color-brand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  };

  return (
    <div className="flex w-full max-w-sm overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[toast-in_var(--duration-normal)_var(--ease-out)] pointer-events-auto">
      <div className="flex items-start p-4">
        <div className="flex-shrink-0">
          {icons[type]}
        </div>
        <div className="ml-3 w-0 flex-1 pt-0.5">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            {title}
          </p>
          {message && (
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {message}
            </p>
          )}
        </div>
        <div className="ml-4 flex flex-shrink-0">
          <button
            type="button"
            className="inline-flex rounded-md bg-[var(--color-surface)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            onClick={() => onDismiss(id)}
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Global Toast Manager would go here, but for simplicity we'll just define the UI component
// and assume consumers will manage state for now.
