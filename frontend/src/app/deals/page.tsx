'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Search, Loader2 } from 'lucide-react';
import DealCard from '@/components/DealCard';
import DealModal from '@/components/DealModal';
import FilterBar from '@/components/FilterBar';
import { getDeals, search } from '@/lib/api';
import { Deal } from '@/types';
import { useFilterStore } from '@/store/useFilterStore';

function DealsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(initialQuery);
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const { category, deal_type, active_only, sort_by } = useFilterStore();

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      if (query) {
        const result = await search(query, { category, deal_type, active_only });
        setDeals(result.deals);
      } else {
        const result = await getDeals({ category, deal_type, active_only, sort_by });
        setDeals(result);
      }
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [query, category, deal_type, active_only, sort_by]);

  useEffect(() => {
    loadDeals();
    setPage(1);
  }, [loadDeals]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
  };

  const paginated = deals.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < deals.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">All Deals</h1>
        <p className="text-brand-muted">
          {loading ? 'Loading...' : `${deals.length.toLocaleString()} deals found`}
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search deals, stores, categories..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-brand-border bg-white outline-none focus:border-primary transition-colors text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-3 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors"
        >
          Search
        </button>
      </form>

      {/* Filters */}
      <FilterBar className="mb-8" />

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : deals.length === 0 ? (
        <div className="text-center py-24 text-brand-muted">
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-semibold text-lg">No deals found</p>
          <p className="text-sm mt-2">Try different keywords or remove some filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={setSelectedDeal} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-8 py-3 border border-brand-border rounded-full text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
              >
                Load more deals
              </button>
            </div>
          )}
        </>
      )}

      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}

export default function DealsPage() {
  return (
    <Suspense>
      <DealsContent />
    </Suspense>
  );
}
