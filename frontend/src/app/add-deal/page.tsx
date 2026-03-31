'use client';
import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { submitDeal } from '@/lib/api';
import { DealType } from '@/types';
import clsx from 'clsx';

const CATEGORIES = [
  'food', 'shopping', 'tech', 'events', 'travel', 'beauty', 'fitness', 'entertainment', 'other',
];

export default function AddDealPage() {
  const [form, setForm] = useState({
    store_name: '',
    deal_title: '',
    description: '',
    discount_text: '',
    address: '',
    deal_type: 'public' as DealType,
    category: 'food',
    expires_at: '',
    source_url: '',
    submitter_email: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitDeal(form);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-2">Deal Submitted!</h2>
        <p className="text-brand-muted mb-6">
          Thanks for contributing! Our team will review and publish your deal within 24 hours.
        </p>
        <button
          onClick={() => { setSuccess(false); setForm({ store_name: '', deal_title: '', description: '', discount_text: '', address: '', deal_type: 'public', category: 'food', expires_at: '', source_url: '', submitter_email: '' }); }}
          className="px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary-dark transition-colors"
        >
          Submit Another Deal
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Add a Deal</h1>
        <p className="text-brand-muted">
          Know about a great deal? Share it with the community! All submissions are reviewed before publishing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-3xl p-8 border border-brand-border shadow-sm">
        {/* Store name */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Store / Brand Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.store_name}
            onChange={set('store_name')}
            required
            placeholder="e.g. KFC, Apple Store, Cold Storage"
            className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Deal title */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Deal Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.deal_title}
            onChange={set('deal_title')}
            required
            placeholder="e.g. 1-for-1 Original Recipe, 50% off all MacBooks"
            className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Discount text + Category row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Discount Text</label>
            <input
              type="text"
              value={form.discount_text}
              onChange={set('discount_text')}
              placeholder="e.g. 50% OFF, 1-for-1"
              className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={set('category')}
              className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm bg-white capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Any extra details, T&Cs, requirements..."
            className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm resize-none"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Location / Address <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.address}
            onChange={set('address')}
            required
            placeholder="e.g. 313 Somerset, 313 Orchard Road, Singapore 238895"
            className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {/* Deal type */}
        <div>
          <label className="block text-sm font-semibold mb-2">Who is this deal for?</label>
          <div className="flex gap-3">
            {(['public', 'student', 'both'] as DealType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, deal_type: t }))}
                className={clsx(
                  'flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all',
                  form.deal_type === t
                    ? 'border-primary bg-orange-50 text-primary'
                    : 'border-brand-border text-brand-muted hover:border-primary/40'
                )}
              >
                {t === 'both' ? 'Everyone' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry + Source row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5">Expiry Date</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={set('expires_at')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">Source URL</label>
            <input
              type="url"
              value={form.source_url}
              onChange={set('source_url')}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold mb-1.5">Your Email (optional)</label>
          <input
            type="email"
            value={form.submitter_email}
            onChange={set('submitter_email')}
            placeholder="For deal status updates"
            className="w-full px-4 py-3 rounded-xl border border-brand-border outline-none focus:border-primary transition-colors text-sm"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {loading ? 'Submitting...' : 'Submit Deal for Review'}
        </button>

        <p className="text-xs text-center text-brand-muted">
          All submissions are manually reviewed. Spam or fake deals will be rejected.
        </p>
      </form>
    </div>
  );
}
