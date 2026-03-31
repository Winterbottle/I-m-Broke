import { Deal, Event, SearchFilters, PlatformStats, DealSubmission } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || 'API error');
  }
  return res.json();
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function getDeals(filters?: Partial<SearchFilters>): Promise<Deal[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.deal_type) params.set('deal_type', filters.deal_type);
  if (filters?.active_only) params.set('active_only', 'true');
  if (filters?.min_quality) params.set('min_quality', String(filters.min_quality));
  if (filters?.sort_by) params.set('sort_by', filters.sort_by);
  return fetchAPI<Deal[]>(`/api/v1/deals?${params}`);
}

export async function getDealById(id: string): Promise<Deal> {
  return fetchAPI<Deal>(`/api/v1/deals/${id}`);
}

export async function getNearbyDeals(
  lat: number,
  lng: number,
  radius_km = 2,
  filters?: Partial<SearchFilters>
): Promise<Deal[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius_km: String(radius_km),
  });
  if (filters?.category) params.set('category', filters.category);
  if (filters?.deal_type) params.set('deal_type', filters.deal_type);
  if (filters?.active_only) params.set('active_only', 'true');
  return fetchAPI<Deal[]>(`/api/v1/deals/nearby?${params}`);
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getEvents(filters?: { category?: string; student_only?: boolean }): Promise<Event[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.student_only) params.set('student_only', 'true');
  return fetchAPI<Event[]>(`/api/v1/events?${params}`);
}

export async function getEventById(id: string): Promise<Event> {
  return fetchAPI<Event>(`/api/v1/events/${id}`);
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function search(query: string, filters?: Partial<SearchFilters>): Promise<{ deals: Deal[]; events: Event[] }> {
  const params = new URLSearchParams({ q: query });
  if (filters?.category) params.set('category', filters.category);
  if (filters?.deal_type) params.set('deal_type', filters.deal_type);
  if (filters?.lat) params.set('lat', String(filters.lat));
  if (filters?.lng) params.set('lng', String(filters.lng));
  return fetchAPI<{ deals: Deal[]; events: Event[] }>(`/api/v1/search?${params}`);
}

// ─── Submit ───────────────────────────────────────────────────────────────────

export async function submitDeal(data: DealSubmission): Promise<{ id: string; message: string }> {
  return fetchAPI<{ id: string; message: string }>('/api/v1/submit/deal', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getStats(): Promise<PlatformStats> {
  return fetchAPI<PlatformStats>('/api/v1/stats');
}

// ─── Track ────────────────────────────────────────────────────────────────────

export async function trackDealView(id: string): Promise<void> {
  await fetchAPI<void>(`/api/v1/deals/${id}/view`, { method: 'POST' }).catch(() => {});
}

export async function trackDealClick(id: string): Promise<void> {
  await fetchAPI<void>(`/api/v1/deals/${id}/click`, { method: 'POST' }).catch(() => {});
}
