'use client';
import { create } from 'zustand';
import { DealCategory, DealType, SearchFilters } from '@/types';

interface FilterState extends SearchFilters {
  userLat?: number;
  userLng?: number;
  setQuery: (q: string) => void;
  setCategory: (c: DealCategory | undefined) => void;
  setDealType: (t: DealType | undefined) => void;
  setActiveOnly: (v: boolean) => void;
  setRadius: (r: number) => void;
  setSortBy: (s: SearchFilters['sort_by']) => void;
  setUserLocation: (lat: number, lng: number) => void;
  reset: () => void;
}

const defaults: Omit<FilterState, keyof { setQuery: unknown; setCategory: unknown; setDealType: unknown; setActiveOnly: unknown; setRadius: unknown; setSortBy: unknown; setUserLocation: unknown; reset: unknown }> = {
  query: '',
  active_only: false,
  radius_km: 5,
  sort_by: 'quality',
};

export const useFilterStore = create<FilterState>((set) => ({
  ...defaults,
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
  setDealType: (deal_type) => set({ deal_type }),
  setActiveOnly: (active_only) => set({ active_only }),
  setRadius: (radius_km) => set({ radius_km }),
  setSortBy: (sort_by) => set({ sort_by }),
  setUserLocation: (lat, lng) => set({ userLat: lat, userLng: lng, lat, lng }),
  reset: () => set({ ...defaults, category: undefined, deal_type: undefined }),
}));
