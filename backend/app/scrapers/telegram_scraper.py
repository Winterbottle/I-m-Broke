"""
Telegram public channel scraper using Telethon.

Ethics:
- Only reads PUBLIC channels (no login wall, viewable by anyone)
- Does NOT scrape private groups or DMs
- Respects Telegram ToS: read-only access to public content
"""
import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.types import Message

from app.ml.ner_pipeline import extract_deal_info
from app.ml.classifier import is_spam
from app.ml.quality_score import compute_quality
from app.db.client import get_supabase

logger = logging.getLogger(__name__)

# Public SG deal/promo Telegram channels (all publicly visible)
PUBLIC_SG_CHANNELS = [
    "mothershipsg",
    "goodlobang",
    "tastesoulsg",
    "studentperkssg",
    "good2gosg",
    "studentdiscountssg",
]

# Keywords that indicate a deal
DEAL_KEYWORDS = [
    "1-for-1", "1 for 1", "buy 1 get 1", "50% off", "discount",
    "promo", "deal", "free", "student price", "student discount",
    "flash sale", "limited time", "coupon", "voucher", "rebate",
    "% off", "sale", "offer", "cheap", "budget",
]


def _contains_deal_keywords(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in DEAL_KEYWORDS)


async def scrape_channel(client: TelegramClient, channel: str, days_back: int = 3) -> list[dict]:
    """Scrape a single public channel for deal messages."""
    deals = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)

    try:
        entity = await client.get_entity(channel)
        async for msg in client.iter_messages(entity, limit=100):
            if not isinstance(msg, Message):
                continue
            if msg.date < cutoff:
                break
            if not msg.text:
                continue
            if not _contains_deal_keywords(msg.text):
                continue
            if is_spam(msg.text):
                continue

            # NER extraction
            info = extract_deal_info(msg.text)
            if not info.get("title"):
                continue

            quality = compute_quality(
                text=msg.text,
                views=getattr(msg, "views", 0) or 0,
                forwards=getattr(msg, "forwards", 0) or 0,
            )

            deals.append({
                **info,
                "source_type": "telegram",
                "source_url": f"https://t.me/{channel}/{msg.id}",
                "raw_text": msg.text,
                "quality_score": quality,
            })

    except Exception as e:
        logger.warning(f"Failed to scrape {channel}: {e}")

    return deals


async def run_telegram_scraper():
    """Main entry point — runs once, scrapes all configured channels."""
    api_id = os.getenv("TELEGRAM_API_ID")
    api_hash = os.getenv("TELEGRAM_API_HASH")
    session = os.getenv("TELEGRAM_SESSION_STRING")

    if not all([api_id, api_hash, session]):
        logger.warning("Telegram credentials not configured, skipping scrape")
        return

    client = TelegramClient(
        StringSession(session),
        int(api_id),
        api_hash,
        flood_sleep_threshold=60,
    )

    async with client:
        all_deals = []
        for channel in PUBLIC_SG_CHANNELS:
            channel_deals = await scrape_channel(client, channel)
            all_deals.extend(channel_deals)
            logger.info(f"[telegram] {channel}: {len(channel_deals)} deals")
            await asyncio.sleep(1)  # polite delay

        if all_deals:
            _upsert_deals(all_deals)
            logger.info(f"[telegram] upserted {len(all_deals)} deals total")


def _upsert_deals(deals: list[dict]):
    sb = get_supabase()
    for deal in deals:
        # Skip if we already have this source_url
        existing = (
            sb.table("deals")
            .select("id")
            .eq("source_url", deal.get("source_url", ""))
            .execute()
        )
        if existing.data:
            continue

        payload = {
            "title": deal.get("title", "")[:500],
            "description": deal.get("description", ""),
            "store_name": deal.get("store_name", "Unknown")[:200],
            "category": deal.get("category", "other"),
            "deal_type": deal.get("deal_type", "public"),
            "discount_text": deal.get("discount_text", ""),
            "address": deal.get("address", ""),
            "image_url": deal.get("image_url"),
            "source_url": deal.get("source_url"),
            "source_type": "telegram",
            "raw_text": deal.get("raw_text", "")[:2000],
            "quality_score": deal.get("quality_score", 50),
            "is_active": True,
        }

        # Geocode address if available
        if deal.get("address"):
            coords = _geocode(deal["address"])
            if coords:
                from sqlalchemy import text
                # Use PostGIS ST_MakePoint via raw SQL through supabase rpc
                payload["lat_lng"] = f"POINT({coords[1]} {coords[0]})"

        sb.table("deals").insert(payload).execute()


def _geocode(address: str) -> Optional[tuple[float, float]]:
    """Geocode an address to (lat, lng) using Nominatim (free, OSM-based)."""
    try:
        from geopy.geocoders import Nominatim
        from geopy.exc import GeocoderTimedOut
        geolocator = Nominatim(user_agent="im_broke_sg/1.0")
        location = geolocator.geocode(f"{address}, Singapore", timeout=5)
        if location:
            return (location.latitude, location.longitude)
    except Exception as e:
        logger.debug(f"Geocode failed for '{address}': {e}")
    return None
