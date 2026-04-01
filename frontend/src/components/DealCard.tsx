'use client';
import Image from 'next/image';
import { MapPin, Clock, Star, BadgeCheck, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import { Deal, CATEGORY_META } from '@/types';
import { trackDealClick } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import SourceBadge from './SourceBadge';

interface Props {
  deal: Deal;
  onClick?: (deal: Deal) => void;
  compact?: boolean;
}

export default function DealCard({ deal, onClick, compact = false }: Props) {
  const meta = CATEGORY_META[deal.category] || CATEGORY_META.other;
  const { user, bookmarks, toggleBookmark, signInWithGoogle } = useAuthStore();
  const isBookmarked = bookmarks.includes(deal.id);
  const isExpiringSoon =
    deal.expires_at &&
    new Date(deal.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 3;
  const isExpired = deal.expires_at && new Date(deal.expires_at) < new Date();

  const handleClick = () => {
    trackDealClick(deal.id);
    onClick?.(deal);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { signInWithGoogle(); return; }
    toggleBookmark(deal.id);
  };

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'deal-card bg-white rounded-2xl overflow-hidden cursor-pointer border border-brand-border',
        compact ? 'flex gap-3 p-3' : 'flex flex-col'
      )}
    >
      {/* Image */}
      <div
        className={clsx(
          'relative bg-gray-100 overflow-hidden flex-shrink-0',
          compact ? 'w-20 h-20 rounded-xl' : 'h-44 w-full'
        )}
      >
        {deal.image_url ? (
          <Image
            src={deal.image_url}
            alt={deal.title}
            fill
            className="object-cover"
            sizes={compact ? '80px' : '(max-width: 768px) 100vw, 400px'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {meta.emoji}
          </div>
        )}

        {!compact && deal.discount_text && (
          <div className="absolute top-3 left-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
            {deal.discount_text}
          </div>
        )}

        {!compact && deal.deal_type === 'student' && (
          <div className="absolute top-3 right-10 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
            Student
          </div>
        )}

        {/* Bookmark button */}
        {!compact && (
          <button
            onClick={handleBookmark}
            className="absolute top-3 right-3 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          >
            <Heart className={clsx('w-3.5 h-3.5', isBookmarked ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className={clsx('flex flex-col', compact ? 'flex-1 min-w-0' : 'p-4')}>
        {/* Category pill */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ color: meta.color, backgroundColor: meta.bg }}
          >
            {meta.emoji} {meta.label}
          </span>
          {compact && deal.deal_type === 'student' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
              Student
            </span>
          )}
          {compact && deal.discount_text && (
            <span className="text-xs font-bold text-primary ml-auto flex-shrink-0">
              {deal.discount_text}
            </span>
          )}
        </div>

        {/* Store + title */}
        <p className={clsx('text-brand-muted font-medium', compact ? 'text-xs' : 'text-xs mb-1')}>
          {deal.store_name}
          {deal.is_verified && (
            <BadgeCheck className="inline w-3.5 h-3.5 ml-1 text-blue-500" />
          )}
        </p>
        <h3 className={clsx('font-bold leading-snug line-clamp-2', compact ? 'text-sm' : 'text-base mb-3')}>
          {deal.title}
        </h3>

        {/* Meta row */}
        <div className={clsx('flex items-center gap-3 text-xs text-brand-muted flex-wrap', compact ? 'mt-auto' : '')}>
          {deal.location.address && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {deal.distance_km != null
                ? `${deal.distance_km.toFixed(1)}km`
                : deal.location.address.split(',')[0]}
            </span>
          )}

          {deal.expires_at && (
            <span
              className={clsx(
                'flex items-center gap-1',
                isExpiringSoon ? 'text-orange-500 font-medium' : '',
                isExpired ? 'text-red-500' : ''
              )}
            >
              <Clock className="w-3 h-3" />
              {isExpired
                ? 'Expired'
                : `Ends ${formatDistanceToNow(new Date(deal.expires_at), { addSuffix: true })}`}
            </span>
          )}

          {!compact && (
            <span className="flex items-center gap-1 ml-auto">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-brand-dark">{deal.quality_score}</span>
            </span>
          )}
        </div>

        {/* Source */}
        {!compact && (
          <div className="mt-3 pt-3 border-t border-brand-border">
            <SourceBadge
              source_type={deal.source_type}
              source_name={deal.source_name}
              source_url={deal.source_url}
            />
          </div>
        )}
      </div>
    </div>
  );
}
