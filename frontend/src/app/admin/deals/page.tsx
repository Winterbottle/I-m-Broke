'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Trash2, Edit, ExternalLink, Send, Globe, User } from 'lucide-react';

const SOURCE_ICONS: Record<string, React.ElementType> = {
  telegram: Send, web: Globe, instagram: Globe, submitted: User,
};

export default function AdminDealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayOnly, setTodayOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('');

  const fetchDeals = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams({ limit: '200' });
    if (todayOnly) params.set('today_only', 'true');
    if (sourceFilter) params.set('source_type', sourceFilter);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/deals?${params}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (res.ok) setDeals(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchDeals(); }, [todayOnly, sourceFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this deal?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/deals/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Deals</h1>
        <Link
          href="/admin/deals/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" /> Add Deal
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <button
          onClick={() => setTodayOnly(!todayOnly)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${todayOnly ? 'bg-primary text-white border-primary' : 'border-brand-border hover:border-primary'}`}
        >
          Today only
        </button>
        {['telegram', 'web', 'instagram', 'submitted'].map((src) => (
          <button
            key={src}
            onClick={() => setSourceFilter(sourceFilter === src ? '' : src)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize ${sourceFilter === src ? 'bg-primary text-white border-primary' : 'border-brand-border hover:border-primary'}`}
          >
            {src}
          </button>
        ))}
        <span className="ml-auto text-sm text-brand-muted self-center">{deals.length} deals</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl h-14 animate-pulse border border-brand-border" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-brand-border">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Deal</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Source</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {deals.map((deal) => {
                const Icon = SOURCE_ICONS[deal.source_type] || Globe;
                return (
                  <tr key={deal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium line-clamp-1">{deal.title}</p>
                      <p className="text-xs text-brand-muted">{deal.store_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 text-brand-muted" />
                        <span className="text-xs capitalize">{deal.source_name || deal.source_type}</span>
                        {deal.source_url && (
                          <a href={deal.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <ExternalLink className="w-3 h-3 text-brand-muted hover:text-primary" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-xs">{deal.category}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${deal.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {deal.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-muted">
                      {new Date(deal.created_at).toLocaleDateString('en-SG')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/admin/deals/${deal.id}/edit`} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Edit className="w-3.5 h-3.5 text-brand-muted" />
                        </Link>
                        <button onClick={() => handleDelete(deal.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {deals.length === 0 && (
            <div className="text-center py-12 text-brand-muted">
              <p>No deals found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
