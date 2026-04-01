'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag, Zap, Globe, Send, User } from 'lucide-react';

const SOURCE_ICONS: Record<string, React.ElementType> = {
  telegram: Send,
  web: Globe,
  instagram: Globe,
  submitted: User,
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

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
