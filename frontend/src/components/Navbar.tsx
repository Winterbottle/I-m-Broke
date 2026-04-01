'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Tag } from 'lucide-react';
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
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Tag className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight">
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
        <div className="md:hidden border-t border-brand-border bg-white px-4 py-3 space-y-1 animate-fade-in">
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
        </div>
      )}
    </header>
  );
}
