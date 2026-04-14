"""
NER pipeline to extract structured deal data from unstructured text.

Uses spaCy for entity recognition + regex patterns for SG-specific deal keywords.
"""
import re
import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Lazy-load spaCy model
_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm")
            _nlp = None
    return _nlp


# ── Regex patterns ────────────────────────────────────────────────────────────

DISCOUNT_PATTERNS = [
    r'\b(\d{1,3})%\s*(?:off|discount|rebate)\b',
    r'\b1[-\s]?for[-\s]?1\b',
    r'\bbuy\s+1\s+get\s+1\b',
    r'\bfree\b',
    r'\bhalf[\s-]price\b',
    r'\$(\d+(?:\.\d{2})?)\s+(?:off|rebate)',
    r'\bup\s+to\s+(\d{1,3})%\s*off\b',
]

DATE_PATTERNS = [
    r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b',
    r'\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{2,4})?\b',
    r'\buntil\s+(\d{1,2}\s+\w+\s*\d{0,4})\b',
    r'\bvalid\s+till?\s+(\d{1,2}[\s/]\w+[\s/]?\d*)\b',
    r'\bexpires?\s+(\d{1,2}\s+\w+\s*\d{0,4})\b',
    r'\bends?\s+(\d{1,2}\s+\w+)\b',
]

SG_LOCATIONS = [
    "orchard", "bugis", "tampines", "jurong", "clementi", "bedok",
    "ang mo kio", "woodlands", "yishun", "serangoon", "bishan",
    "toa payoh", "novena", "dhoby ghaut", "city hall", "raffles",
    "marina bay", "harbourfront", "vivocity", "ion", "plaza singapura",
    "suntec", "mustafa", "little india", "chinatown", "haji lane",
    "holland village", "buona vista", "one-north", "queenstown",
    "bukit timah", "newton", "farrer road", "botanic gardens",
    "upper thomson", "sembawang", "punggol", "sengkang", "pasir ris",
    "changi", "expo", "nus", "ntu", "smu", "sit", "sutd", "sim",
]

CATEGORY_KEYWORDS = {
    "food": ["food", "restaurant", "cafe", "coffee", "bubble tea", "boba", "eat", "drink", "meal",
             "chicken", "beef", "pizza", "sushi", "hawker", "bak kut teh", "nasi", "laksa",
             "mala", "hotpot", "buffet", "brunch", "breakfast", "lunch", "dinner"],
    "shopping": ["mall", "store", "shop", "fashion", "clothes", "apparel", "bag", "shoes",
                 "accessory", "accessories", "online", "marketplace"],
    "tech": ["laptop", "phone", "iphone", "android", "samsung", "apple", "macbook", "ipad",
             "gaming", "headphone", "earbuds", "gadget", "electronics", "computer"],
    "events": ["event", "concert", "show", "exhibition", "festival", "fair", "market",
               "workshop", "class", "seminar", "talk", "performance"],
    "travel": ["hotel", "flight", "staycay", "staycation", "resort", "travel", "holiday",
               "vacation", "airbnb", "booking"],
    "beauty": ["spa", "salon", "facial", "massage", "beauty", "skincare", "manicure",
               "pedicure", "nails", "hair", "makeup", "cosmetic"],
    "fitness": ["gym", "yoga", "pilates", "fitness", "workout", "exercise", "cycling",
                "swimming", "sport", "muay thai", "bjj", "crossfit"],
    "entertainment": ["movie", "cinema", "bowling", "karaoke", "escape room", "arcade",
                      "theme park", "zoo", "aquarium", "museum", "attraction"],
}


def _extract_discount_text(text: str) -> Optional[str]:
    for pattern in DISCOUNT_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return m.group(0).strip()
    return None


def _extract_expiry(text: str) -> Optional[str]:
    for pattern in DATE_PATTERNS:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            raw = m.group(0)
            # Try to parse
            try:
                from dateutil import parser as dateparser
                dt = dateparser.parse(raw, dayfirst=True, fuzzy=True)
                if dt and dt.year >= datetime.now().year:
                    return dt.date().isoformat()
            except Exception:
                pass
    return None


def _extract_location(text: str) -> Optional[str]:
    text_lower = text.lower()
    found = []
    for loc in SG_LOCATIONS:
        if loc in text_lower:
            # Capitalize nicely
            found.append(loc.title())
    if found:
        return ", ".join(found[:2]) + ", Singapore"
    return None


def _classify_category(text: str) -> str:
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        scores[cat] = sum(1 for kw in keywords if kw in text_lower)
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "other"


def _classify_deal_type(text: str) -> str:
    text_lower = text.lower()
    student_kws = ["student", "uni", "university", "poly", "polytechnic", "nus", "ntu",
                   "smu", "sit", "sutd", "sim", "ite", "nsc", "nus card", "student card"]
    if any(kw in text_lower for kw in student_kws):
        return "student"
    return "public"


# Common words that should never be a store name
_STORE_NAME_BLOCKLIST = {
    "buy", "get", "free", "new", "all", "the", "for", "with", "and", "from",
    "just", "now", "only", "save", "use", "try", "see", "win", "top", "big",
    "hot", "pop", "more", "tap", "via", "per", "off", "any", "one", "two",
    "ntu", "nus", "smu", "sit", "sim", "valid", "limited", "special", "enjoy",
    "check", "click", "find", "good", "great", "best", "deal", "promo", "sale",
    "student", "today", "daily", "week", "month", "year", "time", "item",
}


def _extract_store_name(text: str, doc) -> str:
    """Try to extract store/brand name using NER ORG entities."""
    if doc is not None:
        orgs = [ent.text for ent in doc.ents if ent.label_ == "ORG"]
        # Filter out blocklisted words
        orgs = [o for o in orgs if o.lower().strip() not in _STORE_NAME_BLOCKLIST and len(o) > 2]
        if orgs:
            return orgs[0][:200]

    # Fallback: first capitalized word/phrase (Title Case), excluding blocklist
    for m in re.finditer(r'\b([A-Z][a-zA-Z&\'\-]+(?:\s+[A-Z][a-zA-Z&\'\-]+){0,3})\b', text):
        candidate = m.group(1).strip()
        if candidate.lower() not in _STORE_NAME_BLOCKLIST and len(candidate) > 2:
            return candidate[:200]

    return "Unknown"


def _extract_title(text: str) -> str:
    """Use the first sentence or first 150 chars as the title."""
    # Try first line
    lines = text.strip().split("\n")
    for line in lines:
        line = line.strip()
        if len(line) > 10:
            return line[:200]
    return text[:150].strip()


def extract_deal_info(text: str) -> dict:
    """
    Extract structured deal info from raw unstructured text.
    Returns a dict compatible with RawDealIn.
    """
    nlp = _get_nlp()
    doc = nlp(text) if nlp else None

    discount_text = _extract_discount_text(text)
    expiry = _extract_expiry(text)
    address = _extract_location(text)
    category = _classify_category(text)
    deal_type = _classify_deal_type(text)
    store_name = _extract_store_name(text, doc)
    title = _extract_title(text)

    # Clean up description: remove first line if it became the title
    lines = text.strip().split("\n")
    description = "\n".join(lines[1:]).strip()[:500] if len(lines) > 1 else ""

    return {
        "title": title,
        "description": description or None,
        "store_name": store_name,
        "category": category,
        "deal_type": deal_type,
        "discount_text": discount_text,
        "address": address,
        "expires_at": expiry,
    }
