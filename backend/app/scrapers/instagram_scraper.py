"""
Instagram deal scraper using the official Instagram Graph API.

Ethics:
- Uses ONLY the official Meta/Instagram Graph API
- Only accesses public business/creator accounts that have granted permission
- No private account scraping, no web scraping of Instagram
- Requires a valid Meta Developer app with instagram_basic or
  instagram_business_basic permission

Setup:
1. Create a Meta Developer app at developers.facebook.com
2. Add "Instagram Basic Display" or "Instagram Business" product
3. Generate a long-lived access token
4. Set INSTAGRAM_ACCESS_TOKEN in .env
"""
import os
import logging
from typing import Optional
import httpx

from app.ml.ner_pipeline import extract_deal_info
from app.ml.classifier import is_spam
from app.ml.quality_score import compute_quality
from app.db.client import get_supabase

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.instagram.com/v21.0"

# Instagram business accounts that post public deals
# These must have granted your app permission via OAuth
INSTAGRAM_ACCOUNTS: list[str] = []  # Add account IDs after OAuth setup

# Hashtags to search (requires Instagram Graph API search endpoint)
DEAL_HASHTAGS = ["sgdeals", "singaporedeals", "sgfood", "sgpromos", "studentdiscountsg"]


async def fetch_user_media(access_token: str, user_id: str) -> list[dict]:
    """Fetch recent media from an Instagram business account (with permission)."""
    deals = []
    url = f"{GRAPH_API}/{user_id}/media"
    params = {
        "fields": "id,caption,media_type,media_url,permalink,timestamp",
        "access_token": access_token,
        "limit": 20,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.warning(f"[instagram] failed to fetch {user_id}: {e}")
            return []

    for item in data.get("data", []):
        caption = item.get("caption", "")
        if not caption:
            continue

        from app.scrapers.telegram_scraper import _contains_deal_keywords
        if not _contains_deal_keywords(caption):
            continue
        if is_spam(caption):
            continue

        info = extract_deal_info(caption)
        if not info.get("title"):
            continue

        quality = compute_quality(text=caption)
        deals.append({
            **info,
            "source_type": "instagram",
            "source_url": item.get("permalink"),
            "image_url": item.get("media_url") if item.get("media_type") == "IMAGE" else None,
            "raw_text": caption,
            "quality_score": quality,
        })

    return deals


async def run_instagram_scraper():
    """Main entry — fetches deals from configured Instagram accounts via API."""
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    if not token:
        logger.info("[instagram] INSTAGRAM_ACCESS_TOKEN not set, skipping")
        return

    if not INSTAGRAM_ACCOUNTS:
        logger.info("[instagram] No accounts configured, skipping")
        return

    all_deals = []
    for account_id in INSTAGRAM_ACCOUNTS:
        account_deals = await fetch_user_media(token, account_id)
        all_deals.extend(account_deals)
        logger.info(f"[instagram] {account_id}: {len(account_deals)} deals")

    if all_deals:
        from app.scrapers.telegram_scraper import _upsert_deals
        _upsert_deals(all_deals)
        logger.info(f"[instagram] upserted {len(all_deals)} deals total")
