'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tag, Plus, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/useAuthStore';

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/deals', label: 'All Deals', Icon: Tag },
  { href: '/admin/deals/new', label: 'Add Deal', Icon: Plus },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useAuthStore();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-brand-border flex flex-col">
        <div className="p-4 border-b border-brand-border">
          <Link href="/" className="font-black text-lg">
            I&apos;m <span className="text-primary">Broke</span>
          </Link>
          <p className="text-xs text-brand-muted mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === href ? 'bg-orange-50 text-primary' : 'text-brand-dark hover:bg-gray-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-brand-border">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
