"""
Deal Quality Score (0–100).

A regression model that estimates deal quality based on:
- Text signals (discount size, keyword richness, completeness)
- Engagement signals (views, forwards)
- Source reliability
- Freshness

The score is used to rank deals in the feed.
"""
import re
import math
from datetime import datetime, timezone


# ── Feature extraction ────────────────────────────────────────────────────────

def _discount_score(text: str) -> float:
    """0–25 points based on discount magnitude."""
    # Percentage discount
    m = re.search(r'(\d{1,3})%\s*off', text, re.IGNORECASE)
    if m:
        pct = min(int(m.group(1)), 100)
        return (pct / 100) * 25

    if re.search(r'1[-\s]?for[-\s]?1|buy\s+1\s+get\s+1', text, re.IGNORECASE):
        return 20

    if re.search(r'\bfree\b', text, re.IGNORECASE):
        return 18

    if re.search(r'half[-\s]?price', text, re.IGNORECASE):
        return 15

    if re.search(r'\$\d+\s*(?:off|rebate)', text, re.IGNORECASE):
        return 12

    if re.search(r'discount|promo|sale|offer', text, re.IGNORECASE):
        return 8

    return 5


def _completeness_score(text: str, has_address: bool, has_expiry: bool, has_image: bool) -> float:
    """0–25 points based on how complete the deal info is."""
    score = 0.0
    if has_address:
        score += 8
    if has_expiry:
        score += 7
    if has_image:
        score += 5
    # Has price info
    if re.search(r'\$\d', text):
        score += 5
    return min(score, 25)


def _engagement_score(views: int = 0, forwards: int = 0, clicks: int = 0) -> float:
    """0–25 points based on engagement (log-scaled)."""
    total = views + forwards * 5 + clicks * 3
    if total <= 0:
        return 0
    # log scale: 1000 engagement → 25 pts
    return min(math.log10(total + 1) / math.log10(1001) * 25, 25)


def _freshness_score(created_at: datetime | None = None) -> float:
    """0–25 points — newer deals score higher."""
    if created_at is None:
        return 12  # neutral
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    age_hours = (now - created_at).total_seconds() / 3600
    # Full score for < 6h, linear decay to 0 over 7 days
    if age_hours < 6:
        return 25
    if age_hours > 168:
        return 0
    return max(0, 25 * (1 - (age_hours - 6) / 162))


# ── Main function ──────────────────────────────────────────────────────────────

def compute_quality(
    text: str,
    views: int = 0,
    forwards: int = 0,
    clicks: int = 0,
    has_address: bool = False,
    has_expiry: bool = False,
    has_image: bool = False,
    created_at: datetime | None = None,
) -> int:
    """
    Compute a deal quality score from 0–100.

    Higher = better quality / more useful deal.
    """
    # Auto-detect presence from text
    if not has_address:
        has_address = bool(re.search(r'\b(?:singapore|orchard|bugis|tampines|jurong)\b', text, re.IGNORECASE))
    if not has_expiry:
        has_expiry = bool(re.search(r'\b(?:until|valid|expires?|ends?)\b', text, re.IGNORECASE))

    discount = _discount_score(text)
    completeness = _completeness_score(text, has_address, has_expiry, has_image)
    engagement = _engagement_score(views, forwards, clicks)
    freshness = _freshness_score(created_at)

    raw = discount + completeness + engagement + freshness
    return max(0, min(100, round(raw)))


def recompute_scores_batch():
    """
    Re-score all deals in the database (run periodically to update freshness).
    """
    from app.db.client import get_supabase
    sb = get_supabase()
    result = sb.table("deals").select("id, raw_text, view_count, click_count, created_at").execute()

    updates = []
    for row in result.data:
        score = compute_quality(
            text=row.get("raw_text") or "",
            views=row.get("view_count", 0),
            clicks=row.get("click_count", 0),
            created_at=row.get("created_at"),
        )
        updates.append({"id": row["id"], "quality_score": score})

    # Batch update
    for u in updates:
        sb.table("deals").update({"quality_score": u["quality_score"]}).eq("id", u["id"]).execute()

    return len(updates)
