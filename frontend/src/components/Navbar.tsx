'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { usePathname } from 'next/navigation';
import { Menu, X, Activity } from 'lucide-react';
import { HealthBadge } from './HealthBadge';

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Handle checking page scroll offset position
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className={`mx-auto transition-all duration-500 ease-out ${
          scrolled
            ? 'mt-3 max-w-4xl rounded-2xl border border-border/60 bg-background/70 px-4 py-2 shadow-lg backdrop-blur-xl'
            : 'mt-0 max-w-7xl rounded-none border border-transparent bg-transparent px-6 py-4'
        }`}
      >
        <div className="flex items-center justify-between gap-6">
          
          {/* Brand Logo Section */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link href="/" className="flex items-center gap-2 transition-transform active:scale-95">
              <Activity className="h-5 w-5 text-blue-600" strokeWidth={2.5} />
              <span className="font-semibold tracking-tight text-foreground">StatusPing</span>
            </Link>
            <HealthBadge />
          </div>

          {/* Desktop Navigation Links */}
          <ul className="hidden items-center gap-7 text-sm md:flex">
            <li>
              <Link
                href="/status"
                className={`transition-colors hover:text-foreground ${
                  pathname === '/status' ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                Public Status
              </Link>
            </li>
            
            {isAuthenticated && (
              <>
                <li>
                  <Link
                    href="/dashboard"
                    className={`transition-colors hover:text-foreground ${
                      pathname === '/dashboard' || pathname.startsWith('/dashboard/monitors')
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Monitors
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/notifications"
                    className={`transition-colors hover:text-foreground ${
                      pathname === '/dashboard/notifications'
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Notifications
                  </Link>
                </li>
              </>
            )}
          </ul>

          {/* Desktop Authentication Menu Panel */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="rounded-lg border border-border/60 bg-background px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 shadow-sm"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile responsive drawer toggle trigger button */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle navigation drawer menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Panel Drawer Layout */}
        {open && (
          <div className="mt-4 flex flex-col gap-4 border-t border-border/60 pt-4 md:hidden pb-2">
            <Link
              href="/status"
              onClick={() => setOpen(false)}
              className={`text-sm ${
                pathname === '/status' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Public Status
            </Link>
            
            {isAuthenticated && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={`text-sm ${
                    pathname === '/dashboard' || pathname.startsWith('/dashboard/monitors')
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monitors
                </Link>
                <Link
                  href="/dashboard/notifications"
                  onClick={() => setOpen(false)}
                  className={`text-sm ${
                    pathname === '/dashboard/notifications'
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Notifications
                </Link>
              </>
            )}

            {/* Mobile Auth Bottom Action Section */}
            <div className="mt-2 flex flex-col gap-3 border-t border-border/60 pt-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm font-medium text-muted-foreground truncate px-1">
                    {user?.email}
                  </span>
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="rounded-lg border border-border/60 bg-background px-4 py-2 text-center text-sm font-medium hover:bg-muted"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-border/60 bg-background px-4 py-2 text-center text-sm font-medium hover:bg-muted"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90 shadow-sm"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}