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
    <div className="relative">
      {/* Fade hint on right edge */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 pr-8"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {showAll && (
          <button
            onClick={() => onChange(undefined)}
            className={clsx(
              'flex-shrink-0 px-4 rounded-full text-sm font-semibold transition-all border whitespace-nowrap',
              'min-h-[44px] flex items-center',
              !selected
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-white text-brand-muted border-brand-border hover:border-primary/50 hover:text-primary'
            )}
            style={{ scrollSnapAlign: 'start' }}
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
                'flex-shrink-0 flex items-center gap-1.5 px-4 rounded-full text-sm font-semibold transition-all border whitespace-nowrap',
                'min-h-[44px]',
                isActive
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-brand-muted border-brand-border'
              )}
              style={{
                scrollSnapAlign: 'start',
                ...(isActive ? { backgroundColor: meta.color, borderColor: meta.color } : {}),
              }}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
