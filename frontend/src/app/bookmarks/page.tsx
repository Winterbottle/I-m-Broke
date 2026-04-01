'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { getDealById } from '@/lib/api';
import DealCard from '@/components/DealCard';
import DealModal from '@/components/DealModal';
import { Deal } from '@/types';
import Link from 'next/link';

export default function BookmarksPage() {
  const { user, bookmarks } = useAuthStore();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || bookmarks.length === 0) { setLoading(false); return; }
    Promise.all(bookmarks.map((id) => getDealById(id).catch(() => null)))
      .then((results) => setDeals(results.filter(Boolean) as Deal[]))
      .finally(() => setLoading(false));
  }, [user, bookmarks]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-bold mb-2">Sign in to see your bookmarks</h2>
        <p className="text-brand-muted text-sm">Save deals you love and come back to them anytime.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Bookmarks</h1>
        <Link href="/" className="text-sm text-primary font-semibold hover:underline">← Browse deals</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-56 animate-pulse border border-brand-border" />
          ))}
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-20 text-brand-muted border border-dashed border-brand-border rounded-xl">
          <p className="text-4xl mb-3">🤍</p>
          <p className="font-semibold">No bookmarks yet</p>
          <p className="text-sm mt-1">Tap the heart on any deal to save it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={setSelectedDeal} />
          ))}
        </div>
      )}

      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}
