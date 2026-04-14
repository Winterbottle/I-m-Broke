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
    # Price / discount signals
    "$", "sgd", "nett", "++", "per pax", "per person",
    "% off", "% discount", "% rebate",
    "1-for-1", "1 for 1", "buy 1 get 1", "bogo",
    "half price", "half-price",
    # Free stuff
    "free", "foc", "complimentary", "on the house",
    # Promotions
    "promo", "promotion", "sale", "deal", "deals",
    "discount", "offer", "offers", "special",
    "flash sale", "flash deal", "limited time",
    "coupon", "voucher", "redeem", "rebate",
    "promo code", "discount code", "code:", "use code",
    # Student / membership
    "student price", "student discount", "student deal", "student rate",
    # Events / markets
    "artbox", "pop-up", "popup", "bazaar", "fair", "festival",
    "market", "flea", "open house",
    # SG-specific
    "1-for-1", "1for1", "1 for 1",
    "grab deal", "foodpanda deal", "deliveroo deal",
]

# Skip posts that match these — news, ads, unrelated
SKIP_PATTERNS = [
    r"^\[ad\]",
    r"^sponsored\b",
    r"\bwon \$",
    r"\blegal battle\b",
    r"\bcourt\b",
    r"\bministry\b",
    r"\bgovernment\b",
    r"\bparliament\b",
    r"\bprime minister\b",
    r"\bin uncertain times\b",
    r"\bmigrant worker\b",
    r"\bbreaking news\b",
    r"\bpolice\b.*\barrest\b",
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


def _store_website(store_name: str) -> Optional[str]:
    """Return the official website for a known store, for image fallback."""
    if not store_name:
        return None
    name_lower = store_name.lower()
    for key, website in STORE_WEBSITES.items():
        if key in name_lower or name_lower in key:
            return website
    return None


def _identify_known_store(text: str) -> Optional[str]:
    """Scan the message for any known brand name and return the canonical name."""
    text_lower = text.lower()
    # Sorted by length descending so "luckin coffee" matches before "luckin"
    for key in sorted(STORE_WEBSITES.keys(), key=len, reverse=True):
        if key in text_lower:
            # Return title-cased version of the key
            return key.title()
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


async def scrape_channel(client: TelegramClient, channel: str, days_back: int = 14) -> list[dict]:
    """Scrape a single public channel for deal messages."""
    deals = []
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)

    try:
        entity = await client.get_entity(channel)
        seen = 0
        skipped_keyword = 0
        skipped_skip = 0
        skipped_spam = 0
        skipped_title = 0

        async for msg in client.iter_messages(entity, limit=200):
            if not isinstance(msg, Message):
                continue
            if msg.date < cutoff:
                break
            if not msg.text:
                continue
            seen += 1
            if not _contains_deal_keywords(msg.text):
                skipped_keyword += 1
                continue
            if _should_skip(msg.text):
                skipped_skip += 1
                continue
            if is_spam(msg.text):
                skipped_spam += 1
                continue

            # NER extraction
            info = extract_deal_info(msg.text)
            if not info.get("title"):
                skipped_title += 1
                continue

            discount_text = info.get("discount_text", "")

            # Try to identify store from known brands first (more reliable than NER)
            store_name = _identify_known_store(msg.text) or info.get("store_name", "Unknown")

            # Clean raw title
            raw_title = re.sub(r'\*\*+', '', info.get("title", ""))
            raw_title = re.sub(r'[\U00010000-\U0010ffff]', '', raw_title, flags=re.UNICODE)
            raw_title = re.sub(r'\[.*?\]', '', raw_title).strip()
            # Sentence-case it (Telegram posts are often all-caps)
            raw_title = raw_title.capitalize() if raw_title.isupper() else raw_title

            # Format as "Store Name — Deal" so store is always visible first
            if store_name and store_name != "Unknown":
                # Strip store name from title if it already starts with it
                deal_part = re.sub(
                    r'(?i)^' + re.escape(store_name) + r'[\s:–—\-]*', '', raw_title
                ).strip()
                deal_part = re.sub(r'^[\s:–—\-]+', '', deal_part).strip()
                title = f"{store_name} — {deal_part[:120]}" if deal_part else store_name
            else:
                title = raw_title

            # Build clean description
            description = _build_description(msg.text, store_name, discount_text)

            quality = compute_quality(
                text=msg.text,
                views=getattr(msg, "views", 0) or 0,
                forwards=getattr(msg, "forwards", 0) or 0,
            )

            # Extract original source URL — fall back to store website, then Telegram
            telegram_url = f"https://t.me/{channel}/{msg.id}"
            source_url = _extract_source_url(msg.text, store_name) or telegram_url
            source_type = _classify_source(source_url)

            # Fetch og:image — try real source first, then fall back to store website
            is_telegram_url = "t.me" in source_url or "telegram" in source_url
            if not is_telegram_url:
                image_url = _fetch_og_image(source_url)
            else:
                image_url = None
            # If no image yet, try the store's official website
            if not image_url:
                store_site = _store_website(store_name)
                if store_site:
                    image_url = _fetch_og_image(store_site)

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

        logger.info(
            f"[telegram] @{channel}: seen={seen}, "
            f"no_keyword={skipped_keyword}, skip_pattern={skipped_skip}, "
            f"spam={skipped_spam}, no_title={skipped_title}, kept={len(deals)}"
        )

    except Exception as e:
        logger.warning(f"Failed to scrape {channel}: {e}", exc_info=True)

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


def _title_key(title: str) -> str:
    """Normalize a title for dedup comparison — lowercase, strip punctuation, first 60 chars."""
    import re as _re
    t = title.lower().strip()
    t = _re.sub(r'[^\w\s]', '', t)
    t = _re.sub(r'\s+', ' ', t)
    return t[:60]


def _upsert_deals(deals: list[dict]):
    sb = get_supabase()

    # Build a local set of (store_name_lower, title_key) already in DB to avoid dupes
    existing_rows = sb.table("deals").select("store_name, title").execute().data or []
    existing_keys = {
        (_title_key(r.get("store_name", "")), _title_key(r.get("title", "")))
        for r in existing_rows
    }

    for deal in deals:
        # Check by source_url first (fast exact match)
        src_url = deal.get("source_url", "")
        if src_url:
            by_url = sb.table("deals").select("id").eq("source_url", src_url).execute()
            if by_url.data:
                continue

        # Also check by store+title to catch cross-source dupes
        store_key = _title_key(deal.get("store_name", ""))
        title_key = _title_key(deal.get("title", ""))
        if (store_key, title_key) in existing_keys:
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

        # Try to geocode address for map pin (PostGIS POINT format)
        if payload.get("address"):
            coords = _geocode(payload["address"])
            if coords:
                payload["lat_lng"] = f"POINT({coords[1]} {coords[0]})"

        try:
            sb.table("deals").insert(payload).execute()
            existing_keys.add((store_key, title_key))
        except Exception as e:
            logger.warning(f"Failed to insert deal '{payload.get('title', '')}': {e}")


def _geocode(address: str):
    try:
        from geopy.geocoders import Nominatim
        geolocator = Nominatim(user_agent="im_broke_sg/1.0")
        location = geolocator.geocode(f"{address}, Singapore", timeout=5)
        if location:
            return (location.latitude, location.longitude)
    except Exception:
        pass
    return None
