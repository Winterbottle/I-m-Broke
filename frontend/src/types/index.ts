export type DealCategory =
  | 'food'
  | 'shopping'
  | 'tech'
  | 'events'
  | 'travel'
  | 'beauty'
  | 'fitness'
  | 'entertainment'
  | 'other';

export type DealType = 'student' | 'public' | 'both';
export type SourceType = 'telegram' | 'web' | 'instagram' | 'submitted' | 'rss';

export interface DealLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  store_name: string;
  category: DealCategory;
  deal_type: DealType;
  discount_text: string;
  original_price?: number;
  discounted_price?: number;
  location: DealLocation;
  image_url?: string;
  source_url?: string;
  source_type: SourceType;
  expires_at?: string;
  is_active: boolean;
  quality_score: number; // 0–100
  view_count: number;
  click_count: number;
  is_verified: boolean;
  distance_km?: number; // populated when queried near a point
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  organizer: string;
  category: string;
  location: DealLocation & { venue_name?: string };
  start_date: string;
  end_date?: string;
  is_free: boolean;
  price?: number;
  image_url?: string;
  source_url?: string;
  is_student_eligible: boolean;
  is_active: boolean;
  created_at: string;
}

export interface SearchFilters {
  query: string;
  category?: DealCategory;
  deal_type?: DealType;
  active_only: boolean;
  lat?: number;
  lng?: number;
  radius_km?: number;
  min_quality?: number;
  sort_by?: 'distance' | 'quality' | 'recency';
}

export interface PlatformStats {
  total_deals: number;
  active_deals: number;
  total_events: number;
  categories: Record<DealCategory, number>;
  last_updated: string;
}

export interface DealSubmission {
  store_name: string;
  deal_title: string;
  description: string;
  discount_text: string;
  address: string;
  deal_type: DealType;
  expires_at?: string;
  source_url?: string;
  submitter_email?: string;
}

export const CATEGORY_META: Record<
  DealCategory,
  { label: string; emoji: string; color: string; bg: string }
> = {
  food: { label: 'Food & Drinks', emoji: '🍜', color: '#E85D04', bg: '#FFF0E6' },
  shopping: { label: 'Shopping', emoji: '🛍️', color: '#7C3AED', bg: '#F3EEFF' },
  tech: { label: 'Tech', emoji: '💻', color: '#0284C7', bg: '#E0F2FE' },
  events: { label: 'Events', emoji: '🎉', color: '#059669', bg: '#D1FAE5' },
  travel: { label: 'Travel', emoji: '✈️', color: '#0891B2', bg: '#CFFAFE' },
  beauty: { label: 'Beauty', emoji: '💅', color: '#DB2777', bg: '#FCE7F3' },
  fitness: { label: 'Fitness', emoji: '💪', color: '#65A30D', bg: '#ECFCCB' },
  entertainment: { label: 'Entertainment', emoji: '🎬', color: '#D97706', bg: '#FEF3C7' },
  other: { label: 'Other', emoji: '🏷️', color: '#6B7280', bg: '#F3F4F6' },
};

export const SG_CENTER: [number, number] = [103.8198, 1.3521];
