'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Bell, Tag } from 'lucide-react';
import clsx from 'clsx';

const NAV_LINKS = [
  { href: '/deals', label: 'Deals' },
  { href: '/map', label: 'Map' },
  { href: '/events', label: 'Events' },
  { href: '/add-deal', label: 'Add a Deal' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl tracking-tight">
              I&apos;m <span className="text-primary">Broke</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-orange-50 text-primary'
                    : 'text-brand-dark hover:bg-gray-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/signin"
              className="px-4 py-2 text-sm font-semibold rounded-full border border-brand-border hover:border-primary hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/alerts"
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-full transition-colors shadow-sm"
            >
              <Bell className="w-4 h-4" />
              Get Alerts
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-brand-border bg-white px-4 py-4 space-y-1 animate-fade-in">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={clsx(
                'block px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'bg-orange-50 text-primary'
                  : 'text-brand-dark hover:bg-gray-50'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2">
            <Link href="/signin" onClick={() => setOpen(false)} className="text-center px-4 py-2.5 rounded-full border border-brand-border text-sm font-semibold">
              Sign In
            </Link>
            <Link href="/alerts" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-full">
              <Bell className="w-4 h-4" />
              Get Alerts
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
