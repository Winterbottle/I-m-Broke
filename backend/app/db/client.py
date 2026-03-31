import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        _client = create_client(url, key)
    return _client


def row_to_deal(row: dict) -> dict:
    """Normalize a Supabase deals row for the API response."""
    # PostGIS returns geometry as GeoJSON when using select with ST_AsGeoJSON
    lat = row.get("lat") or 1.3521
    lng = row.get("lng") or 103.8198
    return {
        **row,
        "location": {
            "lat": lat,
            "lng": lng,
            "address": row.get("address") or "",
        },
    }


def row_to_event(row: dict) -> dict:
    lat = row.get("lat") or 1.3521
    lng = row.get("lng") or 103.8198
    return {
        **row,
        "location": {
            "lat": lat,
            "lng": lng,
            "address": row.get("address") or "",
            "venue_name": row.get("venue_name"),
        },
    }
