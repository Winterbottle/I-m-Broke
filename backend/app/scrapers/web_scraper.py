"""
Ethical web scraper for public deal pages.

Ethics:
- Only scrapes publicly visible pages (no login required)
- Respects robots.txt
- Uses polite delays between requests
- Only scrapes pages that explicitly list deals/promotions
- User-agent is transparent and identifiable
"""
import asyncio
import logging
from datetime import datetime, timezone
from urllib.robotparser import RobotFileParser
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

from app.ml.ner_pipeline import extract_deal_info
from app.ml.classifier import is_spam
from app.ml.quality_score import compute_quality
from app.db.client import get_supabase

logger = logging.getLogger(__name__)

UA = "ImBrokeSG/1.0 (+https://im-broke.sg/bot) deal aggregator"

# Public deal listing pages in Singapore
# These are publicly accessible pages listing promotions
PUBLIC_DEAL_PAGES = [
    {
        "url": "https://www.nus.edu.sg/osa/student-services/uci/merchants/list-of-merchants",
        "name": "NUS Student Merchants",
        "deal_type": "student",
        "category": "shopping",
    },
    {
        "url": "https://www.ntu.edu.sg/life-at-ntu/student-services/student-discounts",
        "name": "NTU Student Discounts",
        "deal_type": "student",
        "category": "shopping",
    },
    {
        "url": "https://www.straitstimes.com/tags/deals-promotions",
        "name": "Straits Times Deals",
        "deal_type": "public",
        "category": "other",
    },
]


def _is_allowed(url: str) -> bool:
    """Check robots.txt before scraping."""
    try:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = RobotFileParser()
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(UA, url)
    except Exception:
        return True  # If robots.txt is unavailable, allow


async def scrape_page(page_config: dict) -> list[dict]:
    """Scrape a single deal listing page."""
    url = page_config["url"]

    if not _is_allowed(url):
        logger.info(f"[web] robots.txt disallows {url}, skipping")
        return []

    deals = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=UA,
            viewport={"width": 1280, "height": 800},
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=20000)
            await page.wait_for_timeout(2000)
            content = await page.content()
        except PlaywrightTimeout:
            logger.warning(f"[web] timeout scraping {url}")
            await browser.close()
            return []
        finally:
            await browser.close()

    soup = BeautifulSoup(content, "lxml")

    # Remove nav, footer, scripts, ads
    for tag in soup.select("nav, footer, script, style, iframe, .ad, #ad"):
        tag.decompose()

    # Extract text blocks that look like deals
    text_blocks = []
    for el in soup.find_all(["article", "li", "div", "section"], limit=200):
        text = el.get_text(" ", strip=True)
        if len(text) > 30 and len(text) < 1000:
            from app.scrapers.telegram_scraper import _contains_deal_keywords
            if _contains_deal_keywords(text):
                # Find associated link
                link = el.find("a")
                href = urljoin(url, link["href"]) if link and link.get("href") else None
                text_blocks.append({"text": text, "href": href})

    for block in text_blocks[:30]:  # Limit per page
        if is_spam(block["text"]):
            continue
        info = extract_deal_info(block["text"])
        if not info.get("title"):
            continue
        quality = compute_quality(text=block["text"])
        deals.append({
            **info,
            "deal_type": page_config.get("deal_type", "public"),
            "category": info.get("category") or page_config.get("category", "other"),
            "source_url": block["href"] or url,
            "source_type": "web",
            "raw_text": block["text"],
            "quality_score": quality,
        })

    logger.info(f"[web] {url}: {len(deals)} deals")
    return deals


async def run_web_scraper():
    """Scrape all configured public deal pages."""
    all_deals = []
    for config in PUBLIC_DEAL_PAGES:
        page_deals = await scrape_page(config)
        all_deals.extend(page_deals)
        await asyncio.sleep(3)  # Polite delay between sites

    if all_deals:
        _upsert_deals(all_deals)
        logger.info(f"[web] upserted {len(all_deals)} deals total")


def _upsert_deals(deals: list[dict]):
    from app.scrapers.telegram_scraper import _upsert_deals as telegram_upsert
    telegram_upsert(deals)
