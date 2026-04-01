-- ============================================================
-- Migration 001: Auth, Bookmarks, source_name, auto-delete
-- Run in Supabase SQL Editor
-- ============================================================

-- Add source_name to deals for denormalized source display
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_name TEXT;

-- User bookmarks table
CREATE TABLE IF NOT EXISTS user_bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id    UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, deal_id)
);
ALTER TABLE user_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks"
  ON user_bookmarks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Only service role can access this table

-- Index for today's deals queries
CREATE INDEX IF NOT EXISTS deals_today_idx ON deals(created_at DESC) WHERE is_active = TRUE;

-- Auto-delete expired deals via pg_cron (runs hourly)
-- Note: Enable pg_cron extension in Supabase Dashboard > Database > Extensions first
-- SELECT cron.schedule('delete-expired-deals', '0 * * * *',
--   $$DELETE FROM deals WHERE expires_at IS NOT NULL AND expires_at < NOW()$$);
