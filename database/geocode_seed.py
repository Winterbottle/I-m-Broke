"""
Utility script: geocode any deals in the DB that are missing coordinates.
Run once after seeding: python database/geocode_seed.py
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../backend/.env"))

from supabase import create_client
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
import time

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
geolocator = Nominatim(user_agent="im_broke_geocoder/1.0")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1)

result = sb.table("deals").select("id, address").is_("location", "null").execute()
deals = result.data or []

print(f"Geocoding {len(deals)} deals without coordinates...")

for deal in deals:
    addr = deal.get("address")
    if not addr:
        continue
    try:
        loc = geocode(f"{addr}, Singapore")
        if loc:
            # Update using RPC to set PostGIS point
            sb.rpc("set_deal_location", {
                "deal_id": deal["id"],
                "lat": loc.latitude,
                "lng": loc.longitude,
            }).execute()
            print(f"✓ {addr[:50]} → ({loc.latitude:.4f}, {loc.longitude:.4f})")
        else:
            print(f"✗ Could not geocode: {addr[:50]}")
    except Exception as e:
        print(f"✗ Error geocoding {addr[:50]}: {e}")

print("Done.")
