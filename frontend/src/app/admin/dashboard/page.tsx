'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, Zap, Globe, Send, User, Clock, RefreshCw } from 'lucide-react';

const SOURCE_ICONS: Record<string, React.ElementType> = {
  telegram: Send,
  web: Globe,
  instagram: Globe,
  submitted: User,
};

const TELEGRAM_CHANNELS = [
  { name: '@goodlobang', url: 'https://t.me/goodlobang' },
  { name: '@tastesoulsg', url: 'https://t.me/tastesoulsg' },
  { name: '@good2gosg', url: 'https://t.me/good2gosg' },
  { name: '@ThisCounted', url: 'https://t.me/ThisCounted' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [dedupeMsg, setDedupeMsg] = useState('');

  const fetchStats = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/stats`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (res.ok) setStats(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const deduplicate = async () => {
    setDeduping(true);
    setDedupeMsg('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setDeduping(false); return; }
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/deduplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json().catch(() => ({}));
    setDedupeMsg(data.message || 'Done');
    setDeduping(false);
    fetchStats();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={deduplicate}
            disabled={deduping}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {deduping ? 'Removing...' : 'Remove Duplicates'}
          </button>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      {dedupeMsg && <p className="text-sm text-green-600 mb-4">{dedupeMsg}</p>}

      {/* Scheduler info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Scraper runs automatically</p>
          <p className="text-xs text-blue-600 mt-0.5">
            Telegram channels are scraped every <strong>2 hours</strong> — no action needed.
            Expired deals are cleaned up hourly.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-24 animate-pulse border border-brand-border" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Tag} label="Total Deals" value={stats.total_deals} color="text-primary" />
            <StatCard icon={Tag} label="Active Deals" value={stats.active_deals} color="text-green-600" />
            <StatCard icon={Zap} label="Today's Deals" value={stats.today_deals} color="text-orange-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-brand-border p-6">
              <h2 className="font-bold mb-4">Deals by Source</h2>
              <div className="space-y-3">
                {Object.entries(stats.by_source || {}).map(([src, count]) => {
                  const Icon = SOURCE_ICONS[src] || Globe;
                  return (
                    <div key={src} className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-brand-muted" />
                      <span className="text-sm capitalize flex-1">{src}</span>
                      <span className="text-sm font-bold">{count as number}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-brand-border p-6">
              <h2 className="font-bold mb-4">Telegram Channels</h2>
              <p className="text-xs text-brand-muted mb-3">Scraped every 2 hours automatically</p>
              <div className="space-y-3">
                {TELEGRAM_CHANNELS.map((ch) => (
                  <a
                    key={ch.name}
                    href={ch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Send className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-blue-600 flex-1">{ch.name}</span>
                    <span className="text-xs text-brand-muted">→ view</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-brand-muted">Failed to load stats.</p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-brand-border p-5">
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-brand-muted mt-1">{label}</p>
    </div>
  );
}
