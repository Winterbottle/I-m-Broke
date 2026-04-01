import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  bookmarks: string[];
  loading: boolean;
  setUser: (user: User | null) => void;
  setBookmarks: (ids: string[]) => void;
  toggleBookmark: (dealId: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  bookmarks: [],
  loading: true,

  setUser: (user) => set({ user, loading: false }),
  setBookmarks: (bookmarks) => set({ bookmarks }),

  toggleBookmark: async (dealId) => {
    const { user, bookmarks } = get();
    if (!user) return;
    const isBookmarked = bookmarks.includes(dealId);
    if (isBookmarked) {
      await supabase.from('user_bookmarks').delete().match({ user_id: user.id, deal_id: dealId });
      set({ bookmarks: bookmarks.filter((id) => id !== dealId) });
    } else {
      await supabase.from('user_bookmarks').insert({ user_id: user.id, deal_id: dealId });
      set({ bookmarks: [...bookmarks, dealId] });
    }
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, bookmarks: [] });
  },
}));
