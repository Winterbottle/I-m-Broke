'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown, ArrowRight, Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import StatsBar from '@/components/StatsBar';
import CategoryPills from '@/components/CategoryPills';
import DealCard from '@/components/DealCard';
import DealModal from '@/components/DealModal';
import { getDeals, getEvents } from '@/lib/api';
import { Deal, Event, DealCategory, CATEGORY_META } from '@/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const SG_AREAS = [
  'Singapore', 'Orchard', 'Bugis', 'Tampines', 'Jurong East',
  'Clementi', 'Bedok', 'Ang Mo Kio', 'Woodlands', 'Yishun',
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('Singapore');
  const [locationOpen, setLocationOpen] = useState(false);
  const [featuredDeals, setFeaturedDeals] = useState<Deal[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDeals({ sort_by: 'quality', active_only: true }),
      getEvents(),
    ])
      .then(([deals, events]) => {
        setFeaturedDeals(deals.slice(0, 8));
        setUpcomingEvents(events.slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location !== 'Singapore') params.set('location', location);
    router.push(`/deals?${params}`);
  };

  const filteredDeals = selectedCategory
    ? featuredDeals.filter((d) => d.category === selectedCategory)
    : featuredDeals;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-brand-bg pt-16 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <StatsBar />
          </div>

          <h1 className="text-5xl sm:text-6xl font-black leading-tight tracking-tight mb-5">
            Find{' '}
            <span className="text-primary">Amazing Deals</span>
            <br />
            Right Near You
          </h1>

          <p className="text-lg text-brand-muted max-w-xl mx-auto mb-10">
            Student discounts, public offers, flash sales and local events —<br className="hidden sm:block" />
            all in one easy place for everyone.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 bg-white rounded-full shadow-lg border border-brand-border p-2 max-w-2xl mx-auto"
          >
            <Search className="w-5 h-5 text-brand-muted ml-3 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals, stores or categories..."
              className="flex-1 bg-transparent text-brand-dark placeholder-brand-muted outline-none text-sm py-1"
            />

            {/* Location picker */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setLocationOpen(!locationOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-50 hover:bg-gray-100 text-sm font-medium transition-colors border border-brand-border"
              >
                <MapPin className="w-4 h-4 text-primary" />
                {location}
                <ChevronDown className="w-3.5 h-3.5 text-brand-muted" />
              </button>
              {locationOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-brand-border py-2 w-48 z-20">
                  {SG_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => { setLocation(area); setLocationOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 hover:text-primary transition-colors"
                    >
                      {area}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-full transition-colors text-sm flex-shrink-0 shadow-sm"
            >
              Search Deals
            </button>
          </form>
        </div>
      </section>

      {/* ── Category + Featured Deals ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Deals</h2>
          <Link href="/deals" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mb-6">
          <CategoryPills selected={selectedCategory} onChange={setSelectedCategory} />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-brand-border" />
            ))}
          </div>
        ) : filteredDeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} onClick={setSelectedDeal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-brand-muted">
            <p className="text-5xl mb-3">🔍</p>
            <p className="font-semibold">No deals in this category yet</p>
            <p className="text-sm mt-1">Check back soon — we update daily!</p>
          </div>
        )}
      </section>

      {/* ── Map Preview ──────────────────────────────────────────────────────── */}
      <section className="bg-white py-16 border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Deals Near You</h2>
              <p className="text-brand-muted text-sm mt-1">Explore deals on an interactive map</p>
            </div>
            <Link href="/map" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
              Open full map <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <MapView deals={featuredDeals} onDealClick={setSelectedDeal} height="450px" />
        </div>
      </section>

      {/* ── Upcoming Events ───────────────────────────────────────────────────── */}
      {upcomingEvents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Upcoming Events</h2>
            <Link href="/events" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl p-5 border border-brand-border hover:border-primary/30 transition-colors cursor-pointer">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                  🎉 Event
                </span>
                {event.is_student_eligible && (
                  <span className="ml-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                    Student
                  </span>
                )}
                <h3 className="font-bold mt-3 mb-2 leading-snug">{event.title}</h3>
                <p className="text-xs text-brand-muted line-clamp-2 mb-3">{event.description}</p>
                <div className="flex items-center justify-between text-xs text-brand-muted">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location.venue_name || event.location.address.split(',')[0]}
                  </span>
                  <span className={event.is_free ? 'font-bold text-green-600' : 'font-medium'}>
                    {event.is_free ? 'FREE' : `$${event.price}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ───────────────────────────────────────────────────────── */}
      <section className="bg-primary py-16 px-4">
        <div className="max-w-2xl mx-auto text-center text-white">
          <Zap className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h2 className="text-3xl font-black mb-3">Never Miss a Deal Again</h2>
          <p className="opacity-90 mb-6">Get instant alerts for student discounts and flash sales near you.</p>
          <Link
            href="/alerts"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-bold rounded-full hover:bg-orange-50 transition-colors shadow-sm"
          >
            Set Up Alerts <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Deal modal */}
      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </>
  );
}
