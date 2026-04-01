'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Tag, Heart, LogOut, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

const NAV_LINKS = [
  { href: '/deals', label: 'Deals' },
  { href: '/map', label: 'Map' },
  { href: '/events', label: 'Events' },
  { href: '/add-deal', label: 'Add a Deal' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, setUser, setBookmarks, signInWithGoogle, signOut } = useAuthStore();

  useEffect(() => {
    // Initialize auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('user_bookmarks').select('deal_id').eq('user_id', session.user.id)
          .then(({ data }) => setBookmarks((data || []).map((r: { deal_id: string }) => r.deal_id)));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('user_bookmarks').select('deal_id').eq('user_id', session.user.id)
          .then(({ data }) => setBookmarks((data || []).map((r: { deal_id: string }) => r.deal_id)));
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setBookmarks]);

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

          {/* Auth */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link href="/bookmarks" className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Bookmarks">
                  <Heart className="w-4 h-4 text-brand-dark" />
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <Image src={user.user_metadata.avatar_url} alt="avatar" width={24} height={24} className="rounded-full" />
                    ) : (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {(user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium max-w-[100px] truncate">
                      {user.user_metadata?.name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-brand-border rounded-xl shadow-lg py-1 w-40 z-20">
                      <button
                        onClick={() => { signOut(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-gray-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
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
                pathname === link.href ? 'bg-orange-50 text-primary' : 'text-brand-dark hover:bg-gray-50'
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-brand-border">
            {user ? (
              <>
                <Link href="/bookmarks" onClick={() => setOpen(false)} className="block px-4 py-3 text-sm font-medium text-brand-dark hover:bg-gray-50 rounded-lg">
                  My Bookmarks
                </Link>
                <button onClick={() => { signOut(); setOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-medium text-red-500 hover:bg-gray-50 rounded-lg">
                  Sign out
                </button>
              </>
            ) : (
              <button onClick={signInWithGoogle} className="w-full px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg">
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
