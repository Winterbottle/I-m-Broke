'use client';
import { useEffect, useState } from 'react';
import { getStats } from '@/lib/api';
import type { PlatformStats } from '@/types';

// Fallback stats shown before API responds
const FALLBACK: PlatformStats = {
  total_deals: 12400,
  active_deals: 8200,
  total_events: 340,
  categories: {} as never,
  last_updated: new Date().toISOString(),
};

export default function StatsBar() {
  const [stats, setStats] = useState<PlatformStats>(FALLBACK);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="inline-flex items-center gap-2 bg-white border border-brand-border rounded-full px-4 py-2 text-sm font-medium shadow-sm">
      <span className="w-2 h-2 rounded-full bg-green-500 live-dot" />
      Live —{' '}
      <span className="font-bold text-brand-dark">
        {stats.active_deals.toLocaleString()}+
      </span>{' '}
      deals updated daily
    </div>
  );
}
