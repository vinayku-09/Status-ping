'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, className }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-sm transition-opacity duration-[var(--duration-normal)] animate-[fade-in_var(--duration-normal)_var(--ease-out)]"
        onClick={onClose}
      />
      
      {/* Modal Dialog */}
      <div 
        className={cn(
          "relative z-10 w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] m-4 animate-[slide-up_var(--duration-normal)_var(--ease-out)]",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-title-lg text-[var(--color-text-primary)] m-0">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-6 py-4 overflow-y-auto">
          {children}
        </div>
        
        {footer && (
          <div className="px-6 py-4 bg-[var(--color-surface-raised)]/50 border-t border-[var(--color-border)] flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
