"""
Telegram public channel scraper using Telethon.

Ethics:
- Only reads PUBLIC channels (no login wall, viewable by anyone)
- Does NOT scrape private groups or DMs
- Respects Telegram ToS: read-only access to public content
"""
import os
import re
import asyncio
import logging
import requests
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
    "goodlobang",
    "tastesoulsg",
    "good2gosg",
    "ThisCounted",
    "mothershipsg",
]

# Keywords that indicate a deal
DEAL_KEYWORDS = [
    "1-for-1", "1 for 1", "buy 1 get 1", "50% off", "discount",
    "promo", "deal", "free", "student price", "student discount",
    "flash sale", "limited time", "coupon", "voucher", "rebate",
    "% off", "sale", "offer", "cheap", "budget",
]

URL_RE = re.compile(r'https?://[^\s\)\]>\"\']+')

def _clean_text(text: str) -> str:
    """Remove Telegram markdown and clean up text for display."""
    # Remove bold/italic markdown
    text = re.sub(r'\*\*+', '', text)
    text = re.sub(r'__', '', text)
    # Remove arrow/bullet emojis used as list markers
    text = re.sub(r'[➡️👉🔴🟢🟡⬛▪️•·→←↑↓▶️◀️]', '', text)
    # Remove Telegram @mentions and bit.ly links in description
    text = re.sub(r'@\w+', '', text)
    text = re.sub(r'https?://\S+', '', text)
    # Collapse multiple spaces/newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

# Map URL domains to source_type
def _classify_source(url: str) -> str:
    if not url:
        return "web"
    if "instagram.com" in url:
        return "instagram"
    if "t.me" in url or "telegram" in url:
        return "telegram"
    return "web"

def _fetch_og_image(url: str) -> Optional[str]:
    """Fetch the og:image from a URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; ImBrokeSG/1.0)"}
        res = requests.get(url, timeout=8, headers=headers, allow_redirects=True)
        if res.status_code != 200:
            return None
        # Simple regex to find og:image without full HTML parser
        match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', res.text)
        if not match:
            match = re.search(r'<meta[^>]+content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image["\']', res.text)
        return match.group(1) if match else None
    except Exception:
        return None


def _extract_source_url(text: str) -> Optional[str]:
    """Extract the first non-Telegram URL from message text."""
    urls = URL_RE.findall(text)
    for url in urls:
        # Skip Telegram links and tracking noise
        if "t.me" in url or "telegram.me" in url:
            continue
        # Clean trailing punctuation
        url = url.rstrip(".,;!?)")
        return url
    return None

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

            # Clean markdown formatting from title and description
            if info.get("title"):
                info["title"] = _clean_text(info["title"])
            if info.get("description"):
                info["description"] = _clean_text(info["description"])

            quality = compute_quality(
                text=msg.text,
                views=getattr(msg, "views", 0) or 0,
                forwards=getattr(msg, "forwards", 0) or 0,
            )

            # Extract original source URL from message text
            original_url = _extract_source_url(msg.text)
            source_url = original_url or f"https://t.me/{channel}/{msg.id}"
            source_type = _classify_source(original_url) if original_url else "web"

            # Fetch og:image from original source URL
            image_url = None
            if original_url:
                image_url = _fetch_og_image(original_url)

            deals.append({
                **info,
                "source_type": source_type,
                "source_url": source_url,
                "image_url": image_url,
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
            "source_type": deal.get("source_type", "web"),
            "raw_text": deal.get("raw_text", "")[:2000],
            "quality_score": deal.get("quality_score", 50),
            "is_active": True,
        }

        sb.table("deals").insert(payload).execute()
