'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DealFormProps {
  initial?: Record<string, any>;
  dealId?: string;
}

const CATEGORIES = ['food','shopping','tech','events','travel','beauty','fitness','entertainment','other'];
const DEAL_TYPES = ['public','student','both'];
const SOURCE_TYPES = ['web','telegram','instagram','submitted','rss'];

export default function DealForm({ initial, dealId }: DealFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: initial?.title || '',
    store_name: initial?.store_name || '',
    description: initial?.description || '',
    discount_text: initial?.discount_text || '',
    address: initial?.address || '',
    category: initial?.category || 'other',
    deal_type: initial?.deal_type || 'public',
    source_url: initial?.source_url || '',
    source_type: initial?.source_type || 'submitted',
    source_name: initial?.source_name || '',
    image_url: initial?.image_url || '',
    expires_at: initial?.expires_at?.split('T')[0] || '',
    quality_score: initial?.quality_score || 70,
    is_active: initial?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not authenticated'); setLoading(false); return; }

    const payload = { ...form, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null };

    const url = dealId
      ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/deals/${dealId}`
      : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/deals`;

    const res = await fetch(url, {
      method: dealId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail || 'Failed to save deal');
      setLoading(false);
      return;
    }

    router.push('/admin/deals');
  };

  const field = (label: string, key: string, type = 'text', required = false) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <input
        type={type}
        value={form[key as keyof typeof form] as string}
        onChange={(e) => set(key, e.target.value)}
        required={required}
        className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );

  const select = (label: string, key: string, options: string[]) => (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <select
        value={form[key as keyof typeof form] as string}
        onChange={(e) => set(key, e.target.value)}
        className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => <option key={o} value={o} className="capitalize">{o}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('Deal Title', 'title', 'text', true)}
        {field('Store Name', 'store_name', 'text', true)}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('Discount Text (e.g. 50% OFF)', 'discount_text')}
        {field('Address', 'address', 'text', true)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {select('Category', 'category', CATEGORIES)}
        {select('Deal Type', 'deal_type', DEAL_TYPES)}
        {select('Source Type', 'source_type', SOURCE_TYPES)}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('Source URL (original link)', 'source_url', 'url')}
        {field('Source Name (e.g. @sgdeals)', 'source_name')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {field('Image URL', 'image_url', 'url')}
        {field('Expires At', 'expires_at', 'date')}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium mb-1">Quality Score (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.quality_score}
            onChange={(e) => set('quality_score', Number(e.target.value))}
            className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-3 mt-6">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => set('is_active', e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="is_active" className="text-sm font-medium">Active (visible on site)</label>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? 'Saving...' : dealId ? 'Save Changes' : 'Add Deal'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/deals')}
          className="px-6 py-2.5 border border-brand-border rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
