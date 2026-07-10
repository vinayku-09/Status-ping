'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';

export function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  // Monitor scroll offset to trigger structural transformations
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    /* Dynamic Outer Wrapper: Adapts structural padding based on scroll offset */
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
      scrolled ? 'px-4 pt-3' : 'px-0 pt-0'
    }`}>
      <nav
        className={`mx-auto w-full transition-all duration-500 ease-in-out ${
          scrolled
            ? 'max-w-5xl rounded-2xl border border-slate-200/80 bg-white/80 shadow-md shadow-slate-900/5 backdrop-blur-md px-5 py-3'
            : 'max-w-full border-b border-slate-100 bg-white px-6 py-5'
        } ${
          open 
            ? 'max-md:h-[auto] max-md:bg-white max-md:rounded-2xl max-md:border-slate-200 max-md:shadow-xl max-md:mx-0' 
            : ''
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand Logo Section */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="transition-transform active:scale-95 text-blue-600"
            >
              <rect x="2" y="14" width="3" height="6" rx="1" fill="currentColor" />
              <rect x="7" y="10" width="3" height="10" rx="1" fill="currentColor" />
              <rect x="12" y="6" width="3" height="14" rx="1" fill="currentColor" opacity="0.8" />
              <rect x="17" y="12" width="3" height="8" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="22" y="4" width="3" height="16" rx="1" fill="currentColor" opacity="0.7" />
            </svg>
            <span className="font-semibold text-base tracking-tight text-slate-900">
              StatusPing
            </span>
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Docs</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Status</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">Blog</a>
          </div>

          {/* Desktop CTA Action Cluster */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium px-3.5"
            >
              Log in
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/10 font-medium px-4 py-2 rounded-lg"
            >
              Get Started
            </Button>
          </div>
          
          {/* Mobile responsive drawer toggle trigger button */}
          <button 
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 text-slate-700 rounded-lg hover:bg-slate-100 focus:outline-none transition-colors"
            aria-label="Toggle navigation drawer menu"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Dropdown Menu Container */}
        {open && (
          <div className="mt-4 flex flex-col gap-5 border-t border-slate-100 pt-4 md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-1.5">
              <a
                href="#features"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Pricing
              </a>
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Docs
              </a>
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Status
              </a>
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                Blog
              </a>
            </div>

            {/* Mobile Actions Footer Block */}
            <div className="border-t border-slate-100 pt-4 pb-2 flex flex-col gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium py-2.5 rounded-lg"
              >
                Log in
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg shadow-sm shadow-blue-600/10"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}