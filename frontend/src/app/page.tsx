'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import CategoryPills from '@/components/CategoryPills';
import DealCard from '@/components/DealCard';
import DealModal from '@/components/DealModal';
import { getDeals, getEvents } from '@/lib/api';
import { Deal, Event, DealCategory } from '@/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [featuredDeals, setFeaturedDeals] = useState<Deal[]>([]);
  const [todayDeals, setTodayDeals] = useState<Deal[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDeals({ sort_by: 'quality', active_only: true }),
      getDeals({ today_only: true, sort_by: 'recency', active_only: true }),
      getEvents(),
    ])
      .then(([deals, today, events]) => {
        setFeaturedDeals(deals.slice(0, 12));
        setTodayDeals(today);
        setUpcomingEvents(events.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/deals?q=${encodeURIComponent(query)}`);
  };

  const filteredDeals = selectedCategory
    ? featuredDeals.filter((d) => d.category === selectedCategory)
    : featuredDeals;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6">

      {/* ── Search ─────────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="flex items-center gap-2 bg-white rounded-xl border border-brand-border shadow-sm p-2 mb-6 max-w-2xl">
        <Search className="w-4 h-4 text-brand-muted ml-2 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search deals, stores or categories..."
          className="flex-1 bg-transparent text-brand-dark placeholder-brand-muted outline-none text-sm py-1"
        />
        <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors text-sm flex-shrink-0">
          Search
        </button>
      </form>

      {/* ── Today's Deals ──────────────────────────────────────────────────────── */}
      {todayDeals.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-bold">Today&apos;s Deals</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-primary">
              {todayDeals.length} new
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {todayDeals.map((deal) => (
              <div key={deal.id} className="flex-shrink-0 w-64">
                <DealCard deal={deal} onClick={setSelectedDeal} compact={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category filter ─────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <CategoryPills selected={selectedCategory} onChange={setSelectedCategory} />
      </div>

      {/* ── All Deals ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          {selectedCategory
            ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Deals`
            : 'Latest Deals'}
        </h2>
        <Link href="/deals" className="text-sm text-primary font-semibold px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors min-h-[44px] flex items-center">
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-56 animate-pulse border border-brand-border" />
          ))}
        </div>
      ) : filteredDeals.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredDeals.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={setSelectedDeal} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-brand-muted border border-dashed border-brand-border rounded-xl">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">No deals yet</p>
          <p className="text-sm mt-1">Check back soon — we update daily!</p>
        </div>
      )}

      {/* ── Upcoming Events ───────────────────────────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Upcoming Events</h2>
            <Link href="/events" className="text-sm text-primary font-semibold px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors min-h-[44px] flex items-center">View all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-xl p-4 border border-brand-border hover:border-primary/30 transition-colors">
                <div className="flex gap-2 mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">🎉 Event</span>
                  {event.is_student_eligible && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">Student</span>}
                  {event.is_free && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-primary">FREE</span>}
                </div>
                <h3 className="font-bold text-sm leading-snug mb-1">{event.title}</h3>
                <p className="text-xs text-brand-muted line-clamp-2">{event.description}</p>
                <p className="text-xs text-brand-muted mt-2">📍 {event.location.venue_name || event.location.address.split(',')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────────────────────── */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Deals Near You</h2>
          <Link href="/map" className="text-sm text-primary font-semibold px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors min-h-[44px] flex items-center">Open full map →</Link>
        </div>
        <div className="block sm:hidden">
          <MapView deals={featuredDeals} onDealClick={setSelectedDeal} height="150px" />
        </div>
        <div className="hidden sm:block">
          <MapView deals={featuredDeals} onDealClick={setSelectedDeal} height="380px" />
        </div>
      </div>

      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}
