'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import { X, MapPin, Clock, ExternalLink, BadgeCheck, Share2, Navigation } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Deal, CATEGORY_META } from '@/types';

// Known SG store websites — mirrors the backend STORE_WEBSITES dict
const STORE_WEBSITES: Record<string, string> = {
  'mr bean': 'https://www.mrbean.com.sg',
  'starbucks': 'https://www.starbucks.com.sg',
  'coffee bean': 'https://www.coffeebean.com.sg',
  'kfc': 'https://www.kfc.com.sg',
  "mcdonald": 'https://www.mcdonalds.com.sg',
  'subway': 'https://www.subway.com/en-SG',
  'gong cha': 'https://gongcha.com.sg',
  'koi': 'https://www.koithe.com',
  'playmade': 'https://www.playmade.com.sg',
  'tiger sugar': 'https://www.tigersugar.com.sg',
  'sushiro': 'https://www.sushiro.com.sg',
  'nando': 'https://www.nandos.com.sg',
  'toast box': 'https://www.toastbox.com.sg',
  'ya kun': 'https://www.yakun.com',
  'old chang kee': 'https://www.oldchangkee.com',
  'bengawan solo': 'https://www.bengawansolo.com.sg',
  'zalora': 'https://www.zalora.sg',
  'lazada': 'https://www.lazada.sg',
  'shopee': 'https://shopee.sg',
  'grab': 'https://www.grab.com/sg',
  'foodpanda': 'https://www.foodpanda.sg',
  'deliveroo': 'https://deliveroo.com.sg',
  'luckin': 'https://luckincoffee.com.sg',
  'paris baguette': 'https://parisbaguette.com.sg',
  'four leaves': 'https://www.fourleaves.com.sg',
};

function getStoreWebsite(storeName: string, title: string): string | null {
  const haystack = (storeName + ' ' + title).toLowerCase();
  // Sort by length desc to match "luckin coffee" before "luckin"
  const keys = Object.keys(STORE_WEBSITES).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (haystack.includes(key)) return STORE_WEBSITES[key];
  }
  return null;
}

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

          {/* Title */}
          <h2 className="text-xl font-bold mt-1 mb-3 leading-snug">
            {deal.title}
            {deal.is_verified && <BadgeCheck className="inline w-5 h-5 ml-1.5 text-blue-500 align-middle" />}
          </h2>

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
            {(() => {
              const isTelegram = !deal.source_url || deal.source_url.includes('t.me');
              const href = isTelegram
                ? getStoreWebsite(deal.store_name, deal.title)
                : deal.source_url;
              if (!href) return null;
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors"
                >
                  View Deal <ExternalLink className="w-4 h-4" />
                </a>
              );
            })()}
            {deal.location?.address && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deal.location.address + ', Singapore')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                Directions <Navigation className="w-4 h-4" />
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
