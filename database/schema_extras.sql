-- Extra helpers — run after schema.sql

-- Used by geocode_seed.py to set a deal's PostGIS location
CREATE OR REPLACE FUNCTION set_deal_location(deal_id UUID, lat FLOAT, lng FLOAT)
RETURNS VOID AS $$
BEGIN
  UPDATE deals
  SET location = ST_MakePoint(lng, lat)::geography::geometry
  WHERE id = deal_id;
END;
$$ LANGUAGE plpgsql;

-- Insert a deal with coordinates (used by backend scrapers via RPC)
CREATE OR REPLACE FUNCTION insert_deal_with_location(
  p_title TEXT, p_description TEXT, p_store_name TEXT,
  p_category TEXT, p_deal_type TEXT, p_discount_text TEXT,
  p_lat FLOAT, p_lng FLOAT, p_address TEXT,
  p_image_url TEXT, p_source_url TEXT, p_source_type TEXT,
  p_raw_text TEXT, p_quality_score INTEGER
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO deals (
    title, description, store_name, category, deal_type,
    discount_text, location, address, image_url, source_url,
    source_type, raw_text, quality_score
  ) VALUES (
    p_title, p_description, p_store_name, p_category, p_deal_type,
    p_discount_text, ST_MakePoint(p_lng, p_lat), p_address,
    p_image_url, p_source_url, p_source_type, p_raw_text, p_quality_score
  )
  ON CONFLICT (source_url) DO NOTHING
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;
