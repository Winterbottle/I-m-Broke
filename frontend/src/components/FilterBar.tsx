'use client';
import { SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { useFilterStore } from '@/store/useFilterStore';
import CategoryPills from './CategoryPills';

const SORT_OPTIONS = [
  { value: 'quality', label: 'Best Match' },
  { value: 'distance', label: 'Nearest' },
  { value: 'recency', label: 'Newest' },
] as const;

const TYPE_OPTIONS = [
  { value: undefined, label: 'All' },
  { value: 'public', label: 'Public' },
  { value: 'student', label: 'Student Only' },
] as const;

interface Props {
  className?: string;
}

export default function FilterBar({ className }: Props) {
  const {
    category, deal_type, active_only, sort_by,
    setCategory, setDealType, setActiveOnly, setSortBy, reset,
  } = useFilterStore();

  const hasFilters = !!(category || deal_type || active_only);

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Category pills */}
      <CategoryPills selected={category} onChange={setCategory} />

      {/* Controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type filter */}
        <div className="flex items-center bg-white rounded-full border border-brand-border p-1 gap-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setDealType(opt.value as never)}
              className={clsx(
                'px-3 py-1 text-sm font-medium rounded-full transition-all',
                deal_type === opt.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-brand-muted hover:text-brand-dark'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Active only toggle */}
        <button
          onClick={() => setActiveOnly(!active_only)}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all',
            active_only
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-white border-brand-border text-brand-muted hover:border-green-300 hover:text-green-700'
          )}
        >
          <span
            className={clsx('w-2 h-2 rounded-full', active_only ? 'bg-green-500 live-dot' : 'bg-gray-300')}
          />
          Active Now
        </button>

        {/* Sort */}
        <div className="flex items-center gap-1.5 text-sm text-brand-muted">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Sort:</span>
          <select
            value={sort_by || 'quality'}
            onChange={(e) => setSortBy(e.target.value as never)}
            className="bg-transparent font-medium text-brand-dark cursor-pointer outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-sm text-brand-muted hover:text-primary transition-colors ml-auto"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
