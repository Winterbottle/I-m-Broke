'use client';
import clsx from 'clsx';
import { DealCategory, CATEGORY_META } from '@/types';

const CATEGORIES: DealCategory[] = [
  'food', 'shopping', 'tech', 'events', 'travel', 'beauty', 'fitness', 'entertainment',
];

interface Props {
  selected?: DealCategory;
  onChange: (cat: DealCategory | undefined) => void;
  showAll?: boolean;
}

export default function CategoryPills({ selected, onChange, showAll = true }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {showAll && (
        <button
          onClick={() => onChange(undefined)}
          className={clsx(
            'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border',
            !selected
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-white text-brand-muted border-brand-border hover:border-primary/50 hover:text-primary'
          )}
        >
          🏷️ All
        </button>
      )}
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const isActive = selected === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(isActive ? undefined : cat)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border',
              isActive
                ? 'text-white border-transparent shadow-sm'
                : 'bg-white text-brand-muted border-brand-border hover:border-opacity-50'
            )}
            style={
              isActive
                ? { backgroundColor: meta.color, borderColor: meta.color }
                : {}
            }
          >
            <span>{meta.emoji}</span>
            <span>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
