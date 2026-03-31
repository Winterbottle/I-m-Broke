-- ============================================================
-- I'm Broke – Database Schema
-- PostgreSQL + PostGIS (via Supabase)
-- ============================================================
-- Run this in Supabase SQL editor after enabling PostGIS extension.

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy text search

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name, icon, color) VALUES
  ('food',          '🍜', '#E85D04'),
  ('shopping',      '🛍️', '#7C3AED'),
  ('tech',          '💻', '#0284C7'),
  ('events',        '🎉', '#059669'),
  ('travel',        '✈️', '#0891B2'),
  ('beauty',        '💅', '#DB2777'),
  ('fitness',       '💪', '#65A30D'),
  ('entertainment', '🎬', '#D97706'),
  ('other',         '🏷️', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- ── Sources ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('telegram', 'web', 'instagram', 'submitted', 'rss')),
  url             TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sources (name, type, url) VALUES
  ('Telegram – sgdeals',         'telegram',  'https://t.me/sgdeals'),
  ('Telegram – sgfooddeals',     'telegram',  'https://t.me/sgfooddeals'),
  ('Telegram – sgpromos',        'telegram',  'https://t.me/sgpromos'),
  ('Telegram – sgstudentdeals',  'telegram',  'https://t.me/sgstudentdeals'),
  ('NUS Merchants',              'web',       'https://www.nus.edu.sg/osa/student-services/uci/merchants'),
  ('Direct Submission',          'submitted', NULL)
ON CONFLICT DO NOTHING;

-- ── Deals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  store_name       TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'other'
                   CHECK (category IN ('food','shopping','tech','events','travel','beauty','fitness','entertainment','other')),
  deal_type        TEXT NOT NULL DEFAULT 'public'
                   CHECK (deal_type IN ('student','public','both')),
  discount_text    TEXT,
  original_price   NUMERIC(10,2),
  discounted_price NUMERIC(10,2),
  -- Stored as PostGIS point (lng, lat) SRID 4326
  location         GEOMETRY(Point, 4326),
  address          TEXT,
  image_url        TEXT,
  source_url       TEXT UNIQUE,
  source_id        UUID REFERENCES sources(id),
  source_type      TEXT NOT NULL DEFAULT 'submitted'
                   CHECK (source_type IN ('telegram','web','instagram','submitted','rss')),
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  quality_score    INTEGER DEFAULT 50 CHECK (quality_score BETWEEN 0 AND 100),
  raw_text         TEXT,
  view_count       INTEGER DEFAULT 0,
  click_count      INTEGER DEFAULT 0,
  is_verified      BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS deals_location_gist  ON deals USING GIST(location);
CREATE INDEX IF NOT EXISTS deals_category_idx   ON deals(category);
CREATE INDEX IF NOT EXISTS deals_active_idx     ON deals(is_active, expires_at);
CREATE INDEX IF NOT EXISTS deals_quality_idx    ON deals(quality_score DESC);
CREATE INDEX IF NOT EXISTS deals_type_idx       ON deals(deal_type);
CREATE INDEX IF NOT EXISTS deals_created_idx    ON deals(created_at DESC);
-- Trigram index for fast text search
CREATE INDEX IF NOT EXISTS deals_title_trgm     ON deals USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS deals_store_trgm     ON deals USING GIN(store_name gin_trgm_ops);

-- ── Events ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  description         TEXT,
  organizer           TEXT,
  category            TEXT DEFAULT 'other',
  location            GEOMETRY(Point, 4326),
  address             TEXT,
  venue_name          TEXT,
  start_date          TIMESTAMPTZ NOT NULL,
  end_date            TIMESTAMPTZ,
  is_free             BOOLEAN DEFAULT TRUE,
  price               NUMERIC(10,2),
  image_url           TEXT,
  source_url          TEXT,
  source_id           UUID REFERENCES sources(id),
  is_student_eligible BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS events_location_gist ON events USING GIST(location);
CREATE INDEX IF NOT EXISTS events_dates_idx     ON events(start_date, end_date);
CREATE INDEX IF NOT EXISTS events_active_idx    ON events(is_active, start_date);

-- ── Deal Submissions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deal_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name      TEXT NOT NULL,
  deal_title      TEXT NOT NULL,
  description     TEXT,
  discount_text   TEXT,
  address         TEXT NOT NULL,
  deal_type       TEXT DEFAULT 'public' CHECK (deal_type IN ('student','public','both')),
  category        TEXT DEFAULT 'other',
  expires_at      DATE,
  source_url      TEXT,
  submitter_email TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

-- ── Views (flatten geometry for API) ─────────────────────────────────────────
CREATE OR REPLACE VIEW deals_view AS
SELECT
  d.*,
  ST_Y(d.location::geometry) AS lat,
  ST_X(d.location::geometry) AS lng
FROM deals d;

CREATE OR REPLACE VIEW events_view AS
SELECT
  e.*,
  ST_Y(e.location::geometry) AS lat,
  ST_X(e.location::geometry) AS lng
FROM events e;

-- ── PostGIS Functions ────────────────────────────────────────────────────────

-- Returns deals within radius, ordered by distance, with distance_m column
CREATE OR REPLACE FUNCTION deals_within_radius(p_lat FLOAT, p_lng FLOAT, radius_km FLOAT)
RETURNS TABLE (
  id UUID, title TEXT, description TEXT, store_name TEXT,
  category TEXT, deal_type TEXT, discount_text TEXT,
  original_price NUMERIC, discounted_price NUMERIC,
  address TEXT, image_url TEXT, source_url TEXT, source_type TEXT,
  expires_at TIMESTAMPTZ, is_active BOOLEAN, quality_score INTEGER,
  view_count INTEGER, click_count INTEGER, is_verified BOOLEAN,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  lat FLOAT, lng FLOAT, distance_m FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.title, d.description, d.store_name,
    d.category, d.deal_type, d.discount_text,
    d.original_price, d.discounted_price,
    d.address, d.image_url, d.source_url, d.source_type,
    d.expires_at, d.is_active, d.quality_score,
    d.view_count, d.click_count, d.is_verified,
    d.created_at, d.updated_at,
    ST_Y(d.location::geometry)::FLOAT AS lat,
    ST_X(d.location::geometry)::FLOAT AS lng,
    ST_Distance(
      d.location::geography,
      ST_MakePoint(p_lng, p_lat)::geography
    )::FLOAT AS distance_m
  FROM deals d
  WHERE
    d.is_active = TRUE
    AND ST_DWithin(
      d.location::geography,
      ST_MakePoint(p_lng, p_lat)::geography,
      radius_km * 1000
    )
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Increment view counter (atomic)
CREATE OR REPLACE FUNCTION increment_view(deal_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE deals SET view_count = view_count + 1 WHERE id = deal_id;
END;
$$ LANGUAGE plpgsql;

-- Increment click counter (atomic)
CREATE OR REPLACE FUNCTION increment_click(deal_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE deals SET click_count = click_count + 1 WHERE id = deal_id;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE deals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_submissions ENABLE ROW LEVEL SECURITY;

-- Public read access for active deals
CREATE POLICY "Public read active deals"
  ON deals FOR SELECT
  USING (is_active = TRUE);

-- Public read all events
CREATE POLICY "Public read events"
  ON events FOR SELECT
  USING (TRUE);

-- Anyone can submit a deal
CREATE POLICY "Anyone can submit"
  ON deal_submissions FOR INSERT
  WITH CHECK (TRUE);

-- Service role can do everything (for the backend)
-- The service key bypasses RLS automatically in Supabase.
