'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import { X, MapPin, Clock, ExternalLink, Star, BadgeCheck, Share2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Deal, CATEGORY_META } from '@/types';

interface Props {
  deal: Deal | null;
  onClose: () => void;
}

export default function DealModal({ deal, onClose }: Props) {
  useEffect(() => {
    if (deal) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [deal]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!deal) return null;

  const meta = CATEGORY_META[deal.category] || CATEGORY_META.other;
  const isExpired = deal.expires_at && new Date(deal.expires_at) < new Date();

  const share = async () => {
    try {
      await navigator.share({ title: deal.title, text: deal.description, url: deal.source_url || window.location.href });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Image */}
        <div className="relative h-56 bg-gray-100">
          {deal.image_url ? (
            <Image src={deal.image_url} alt={deal.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl">
              {meta.emoji}
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
          {deal.discount_text && (
            <div className="absolute bottom-4 left-4 bg-primary text-white font-bold px-3 py-1.5 rounded-full shadow-sm text-sm">
              {deal.discount_text}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Category + type */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ color: meta.color, backgroundColor: meta.bg }}
            >
              {meta.emoji} {meta.label}
            </span>
            {deal.deal_type === 'student' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                Student Only
              </span>
            )}
            {deal.deal_type === 'both' && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                Student + Public
              </span>
            )}
          </div>

          {/* Store name */}
          <p className="text-sm text-brand-muted font-medium flex items-center gap-1">
            {deal.store_name}
            {deal.is_verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold mt-1 mb-3 leading-snug">{deal.title}</h2>

          {/* Description */}
          {deal.description && (
            <p className="text-sm text-brand-muted leading-relaxed mb-4">{deal.description}</p>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {deal.location.address && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-brand-muted mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Location
                </div>
                <p className="text-sm font-medium leading-snug">{deal.location.address}</p>
                {deal.distance_km != null && (
                  <p className="text-xs text-primary font-medium mt-0.5">{deal.distance_km.toFixed(1)}km away</p>
                )}
              </div>
            )}
            {deal.expires_at && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-brand-muted mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Expires
                </div>
                <p className={`text-sm font-medium ${isExpired ? 'text-red-500' : ''}`}>
                  {format(new Date(deal.expires_at), 'dd MMM yyyy')}
                </p>
                {!isExpired && (
                  <p className="text-xs text-orange-500 font-medium mt-0.5">
                    {formatDistanceToNow(new Date(deal.expires_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            )}
          </div>


          {/* Actions */}
          <div className="flex gap-3">
            {deal.source_url && (
              <a
                href={deal.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
              >
                View Deal <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={share}
              className="w-12 h-12 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <Share2 className="w-5 h-5 text-brand-dark" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
