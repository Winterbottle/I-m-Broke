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
]

# Known SG store official websites — used when no URL is in the post
STORE_WEBSITES = {
    "mr bean": "https://www.mrbean.com.sg",
    "nando": "https://www.nandos.com.sg",
    "nando's": "https://www.nandos.com.sg",
    "sushiro": "https://www.sushiro.com.sg",
    "koi": "https://www.koithe.com",
    "playmade": "https://www.playmade.com.sg",
    "gong cha": "https://gongcha.com.sg",
    "gongcha": "https://gongcha.com.sg",
    "tiger sugar": "https://www.tigersugar.com.sg",
    "mcdonald": "https://www.mcdonalds.com.sg",
    "kfc": "https://www.kfc.com.sg",
    "subway": "https://www.subway.com/en-SG",
    "starbucks": "https://www.starbucks.com.sg",
    "toast box": "https://www.toastbox.com.sg",
    "ya kun": "https://www.yakun.com",
    "old chang kee": "https://www.oldchangkee.com",
    "bengawan solo": "https://www.bengawansolo.com.sg",
    "artbox": "https://www.artbox.sg",
    "zalora": "https://www.zalora.sg",
    "lazada": "https://www.lazada.sg",
    "shopee": "https://shopee.sg",
    "grab": "https://www.grab.com/sg",
    "foodpanda": "https://www.foodpanda.sg",
    "deliveroo": "https://deliveroo.com.sg",
    "luckin": "https://luckincoffee.com.sg",
    "luckin coffee": "https://luckincoffee.com.sg",
    "hokkaido baked cheese tart": "https://www.baked.com.sg",
    "paris baguette": "https://parisbaguette.com.sg",
    "four leaves": "https://www.fourleaves.com.sg",
}

# Keywords that indicate an actual deal/event (must have at least one)
DEAL_KEYWORDS = [
    "1-for-1", "1 for 1", "buy 1 get 1", "% off", "% discount",
    "free entry", "free admission", "free flow", "free item",
    "student price", "student discount", "student deal",
    "flash sale", "limited time offer", "coupon", "voucher",
    "promo code", "discount code", "redeem", "special price",
    "$", "sgd", "nett", "++", "per pax", "per person",
    "artbox", "pop-up", "popup", "bazaar", "fair", "festival",
]

# Skip posts that match these — news, ads, unrelated
SKIP_PATTERNS = [
    r"^\[ad\]",
    r"^ad\b",
    r"\bfollow\b.*\bchannel\b",
    r"\bwon \$",
    r"\blegal battle\b",
    r"\bcourt\b",
    r"\bministry\b",
    r"\bgovernment\b",
    r"\bparliament\b",
    r"\bprime minister\b",
    r"\bin uncertain times\b",
    r"\bmigrant worker\b",
]

URL_RE = re.compile(r'https?://[^\s\)\]>\"\']+')
SHORTLINK_RE = re.compile(r'\b(bit\.ly|tinyurl\.com|t\.co|go\.gov\.sg|rb\.gy)/[\w\-]+')


def _resolve_url(url: str) -> str:
    """Follow redirects to get the final URL."""
    try:
        if not url.startswith("http"):
            url = "https://" + url
        res = requests.head(url, allow_redirects=True, timeout=8,
                            headers={"User-Agent": "Mozilla/5.0"})
        return res.url
    except Exception:
        return url


def _extract_source_url(text: str, store_name: str = "") -> Optional[str]:
    """Extract and resolve the first non-Telegram URL from message text.
    Falls back to known store website if no URL found."""
    # Try full URLs first
    for url in URL_RE.findall(text):
        if "t.me" in url or "telegram.me" in url:
            continue
        url = url.rstrip(".,;!?)")
        resolved = _resolve_url(url)
        # Skip if it resolved back to Telegram
        if "t.me" in resolved or "telegram" in resolved:
            continue
        return resolved
    # Fallback: shortlinks without protocol (e.g. bit.ly/xxx)
    match = SHORTLINK_RE.search(text)
    if match:
        resolved = _resolve_url(match.group(0))
        if "t.me" not in resolved:
            return resolved
    # Fallback: known store website
    if store_name:
        name_lower = store_name.lower()
        for key, website in STORE_WEBSITES.items():
            if key in name_lower:
                return website
    return None


def _classify_source(url: str) -> str:
    if not url:
        return "web"
    if "instagram.com" in url:
        return "instagram"
    return "web"


def _fetch_og_image(url: str) -> Optional[str]:
    """Fetch the og:image from a URL."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; ImBrokeSG/1.0)"}
        res = requests.get(url, timeout=8, headers=headers, allow_redirects=True)
        if res.status_code != 200:
            return None
        match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', res.text)
        if not match:
            match = re.search(r'<meta[^>]+content=["\'](https?://[^"\']+)["\'][^>]+property=["\']og:image["\']', res.text)
        return match.group(1) if match else None
    except Exception:
        return None


def _build_description(text: str, store_name: str, discount_text: str) -> str:
    """Build a clean, human-readable description from deal facts."""
    # Strip markdown and emojis
    clean = re.sub(r'\*\*+', '', text)
    clean = re.sub(r'[\U00010000-\U0010ffff]', ' ', clean, flags=re.UNICODE)
    clean = re.sub(r'@\w+', '', clean)
    clean = re.sub(r'https?://\S+', '', clean)
    clean = re.sub(r'\b(bit\.ly|tinyurl\.com|rb\.gy)/\S+', '', clean)
    clean = re.sub(r'More info:.*', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'Find more.*', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r"Can't find a friend.*", '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'psst!.*', '', clean, flags=re.IGNORECASE)
    clean = re.sub(r'\[.*?\]', '', clean)  # remove [Ad], [Pop-Ups] etc

    # Extract date range (e.g. "Now - 30 Apr", "12 April only")
    date_match = re.search(r'(now\s*[-–]\s*[\w\s]+\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b[\w\s]*|today only|\d+\s*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b[^\.]*)', clean, re.IGNORECASE)
    validity = date_match.group(0).strip() if date_match else ""

    # Extract location hints
    loc_match = re.search(r'(?:all outlets|all\s+\w+\s+outlets|(?:at|@)\s+[A-Z][^\.]+)', clean)
    location_hint = loc_match.group(0).strip() if loc_match else ""

    # Extract items/details — lines with $ or descriptive content
    item_lines = []
    for line in clean.split('\n'):
        line = line.strip()
        if not line or len(line) < 5:
            continue
        if re.search(r'\$[\d]|nett|\+\+|per pax|incl\.|includes', line, re.IGNORECASE):
            item_lines.append(line)

    # Build the description
    parts = []
    if discount_text:
        parts.append(f"{discount_text} deal at {store_name}.")
    else:
        parts.append(f"Special deal at {store_name}.")

    if item_lines:
        parts.append(" ".join(item_lines[:2]))  # first 2 relevant lines

    if validity:
        parts.append(f"Valid: {validity}.")

    if location_hint:
        parts.append(location_hint.capitalize() + ".")

    result = " ".join(parts)
    # Final cleanup
    result = re.sub(r'[ \t]{2,}', ' ', result)
    result = re.sub(r'\s([.,])', r'\1', result)
    return result.strip()[:600]


def _contains_deal_keywords(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in DEAL_KEYWORDS)


def _should_skip(text: str) -> bool:
    text_lower = text.lower()
    return any(re.search(p, text_lower) for p in SKIP_PATTERNS)


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
            if _should_skip(msg.text):
                continue
            if is_spam(msg.text):
                continue

            # NER extraction
            info = extract_deal_info(msg.text)
            if not info.get("title"):
                continue

            # Clean title
            title = re.sub(r'\*\*+', '', info.get("title", ""))
            title = re.sub(r'[\U00010000-\U0010ffff]', '', title, flags=re.UNICODE)
            title = re.sub(r'\[.*?\]', '', title).strip()

            store_name = info.get("store_name", "Unknown")
            discount_text = info.get("discount_text", "")

            # Build clean description
            description = _build_description(msg.text, store_name, discount_text)

            quality = compute_quality(
                text=msg.text,
                views=getattr(msg, "views", 0) or 0,
                forwards=getattr(msg, "forwards", 0) or 0,
            )

            # Extract original source URL (never Telegram)
            source_url = _extract_source_url(msg.text, store_name)
            if not source_url:
                # Skip deals with no traceable source
                logger.debug(f"Skipping deal with no source URL: {title[:50]}")
                continue

            source_type = _classify_source(source_url)

            # Fetch og:image from the real source
            image_url = _fetch_og_image(source_url)

            deals.append({
                **info,
                "title": title,
                "description": description,
                "source_type": source_type,
                "source_url": source_url,
                "source_name": f"@{channel}",
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
            await asyncio.sleep(1)

        if all_deals:
            _upsert_deals(all_deals)
            logger.info(f"[telegram] upserted {len(all_deals)} deals total")


def _upsert_deals(deals: list[dict]):
    sb = get_supabase()
    for deal in deals:
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
            "source_name": deal.get("source_name", ""),
            "raw_text": deal.get("raw_text", "")[:2000],
            "quality_score": deal.get("quality_score", 50),
            "is_active": True,
        }

        sb.table("deals").insert(payload).execute()
