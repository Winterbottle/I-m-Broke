'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import FilterBar from '@/components/FilterBar';
import DealModal from '@/components/DealModal';
import DealCard from '@/components/DealCard';
import { getDeals, getNearbyDeals } from '@/lib/api';
import { Deal } from '@/types';
import { useFilterStore } from '@/store/useFilterStore';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 rounded-2xl flex items-center justify-center" style={{ height: '70vh' }}>
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  ),
});

export default function MapPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const { category, deal_type, active_only, userLat, userLng, radius_km } = useFilterStore();

  useEffect(() => {
    setLoading(true);
    const fn =
      userLat && userLng
        ? getNearbyDeals(userLat, userLng, radius_km, { category, deal_type, active_only })
        : getDeals({ category, deal_type, active_only, sort_by: 'quality' });

    fn.then(setDeals)
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [category, deal_type, active_only, userLat, userLng, radius_km]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-black mb-1">Deal Map</h1>
        <p className="text-brand-muted text-sm">
          {loading ? 'Loading deals...' : `${deals.length} deals on map · Click a pin for details`}
        </p>
      </div>

      <FilterBar className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map (2/3 width) */}
        <div className="lg:col-span-2">
          <MapView deals={deals} onDealClick={setSelectedDeal} height="70vh" />
        </div>

        {/* Sidebar deal list (1/3 width) */}
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide sticky top-0 bg-brand-bg py-2">
            {deals.length} Deals
          </p>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-brand-border" />
            ))
          ) : deals.length === 0 ? (
            <div className="text-center py-8 text-brand-muted">
              <p className="text-3xl mb-2">📍</p>
              <p className="text-sm">No deals found in this area</p>
            </div>
          ) : (
            deals.map((deal) => (
              <DealCard key={deal.id} deal={deal} compact onClick={setSelectedDeal} />
            ))
          )}
        </div>
      </div>

      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}
