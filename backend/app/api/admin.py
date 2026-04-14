"""
Admin API — requires Supabase JWT + admin_users table membership.
Also includes scraper trigger endpoints (protected by same JWT).
"""
import os
from typing import Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt

from app.db.client import get_supabase, row_to_deal
from app.models.deal import DealCategory, DealType

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer(auto_error=False)


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _verify_admin(credentials: Optional[HTTPAuthorizationCredentials]) -> str:
    """Verify Supabase JWT and check admin_users table. Returns user_id."""
    # Allow simple secret key for scraper triggers (backwards compat)
    if credentials is None:
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = credentials.credentials

    # Check simple secret key first (for scraper triggers)
    admin_key = os.getenv("ADMIN_SECRET_KEY", "")
    if admin_key and token == admin_key:
        return "admin"

    # Verify using Supabase Auth API (works with ECC and legacy keys)
    try:
        sb = get_supabase()
        user_response = sb.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = user_response.user.id

        # Check admin_users table
        result = sb.table("admin_users").select("id").eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=403, detail="Not an admin")

        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    return _verify_admin(credentials)


# ── Pydantic models ───────────────────────────────────────────────────────────

class DealCreateIn(BaseModel):
    title: str
    description: Optional[str] = None
    store_name: str
    category: str = "other"
    deal_type: str = "public"
    discount_text: Optional[str] = None
    address: str
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    source_type: str = "submitted"
    source_name: Optional[str] = None
    expires_at: Optional[str] = None
    quality_score: int = 70
    is_active: bool = True


class DealUpdateIn(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    store_name: Optional[str] = None
    category: Optional[str] = None
    deal_type: Optional[str] = None
    discount_text: Optional[str] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    expires_at: Optional[str] = None
    quality_score: Optional[int] = None
    is_active: Optional[bool] = None


# ── Scraper triggers (secret key or JWT) ─────────────────────────────────────

@router.post("/scrape/web")
async def trigger_web_scraper(user_id: str = Depends(require_admin)):
    try:
        from app.scrapers.web_scraper import run_web_scraper
        await run_web_scraper()
        return {"status": "ok", "message": "Web scraper completed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scrape/telegram")
async def trigger_telegram_scraper(user_id: str = Depends(require_admin)):
    try:
        import asyncio
        from app.scrapers.telegram_scraper import run_telegram_scraper
        # Run in background so the HTTP request doesn't time out
        asyncio.create_task(run_telegram_scraper())
        return {"status": "ok", "message": "Telegram scraper started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Deal CRUD ─────────────────────────────────────────────────────────────────

@router.get("/deals")
async def admin_list_deals(
    today_only: bool = False,
    source_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    user_id: str = Depends(require_admin),
):
    sb = get_supabase()
    q = sb.table("deals_view").select("*")

    if source_type:
        q = q.eq("source_type", source_type)
    if is_active is not None:
        q = q.eq("is_active", is_active)
    if today_only:
        sgt_now = datetime.now(timezone.utc) + timedelta(hours=8)
        today_start = sgt_now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=8)
        q = q.gte("created_at", today_start.isoformat())

    q = q.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = q.execute()
    return result.data or []


@router.post("/deals")
async def admin_create_deal(data: DealCreateIn, user_id: str = Depends(require_admin)):
    sb = get_supabase()
    payload = data.model_dump(exclude_none=True)

    # Geocode address if no coordinates
    if data.address:
        try:
            from app.scrapers.telegram_scraper import _geocode
            coords = _geocode(data.address)
            if coords:
                payload["lat_lng"] = f"POINT({coords[1]} {coords[0]})"
        except Exception:
            pass

    result = sb.table("deals").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create deal")
    return result.data[0]


@router.patch("/deals/{deal_id}")
async def admin_update_deal(deal_id: str, data: DealUpdateIn, user_id: str = Depends(require_admin)):
    sb = get_supabase()
    payload = data.model_dump(exclude_none=True)
    if not payload:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = sb.table("deals").update(payload).eq("id", deal_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Deal not found")
    return result.data[0]


@router.delete("/deals/{deal_id}")
async def admin_delete_deal(deal_id: str, user_id: str = Depends(require_admin)):
    sb = get_supabase()
    sb.table("deals").delete().eq("id", deal_id).execute()
    return {"status": "ok"}


@router.post("/deduplicate")
async def deduplicate_deals(user_id: str = Depends(require_admin)):
    """Remove duplicate deals — keeps the one with the best image/quality, deletes the rest."""
    import re as _re

    def _key(title: str, store: str) -> str:
        t = (store + " " + title).lower()
        t = _re.sub(r'[^\w\s]', '', t)
        t = _re.sub(r'\s+', ' ', t).strip()
        return t[:80]

    sb = get_supabase()
    rows = sb.table("deals").select("id, title, store_name, image_url, quality_score").execute().data or []

    groups: dict[str, list[dict]] = {}
    for row in rows:
        k = _key(row.get("title", ""), row.get("store_name", ""))
        groups.setdefault(k, []).append(row)

    deleted = 0
    for key, dupes in groups.items():
        if len(dupes) <= 1:
            continue
        # Keep the one with an image, then highest quality_score
        dupes.sort(key=lambda r: (1 if r.get("image_url") else 0, r.get("quality_score", 0)), reverse=True)
        to_delete = [r["id"] for r in dupes[1:]]
        for deal_id in to_delete:
            sb.table("deals").delete().eq("id", deal_id).execute()
            deleted += 1

    return {"deleted": deleted, "message": f"Removed {deleted} duplicate deals"}


@router.get("/stats")
async def admin_stats(user_id: str = Depends(require_admin)):
    sb = get_supabase()
    deals = sb.table("deals").select("source_type, is_active, created_at").execute().data or []

    sgt_now = datetime.now(timezone.utc) + timedelta(hours=8)
    today_start = sgt_now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(hours=8)

    total = len(deals)
    active = sum(1 for d in deals if d.get("is_active"))
    today = sum(1 for d in deals if d.get("created_at", "") >= today_start.isoformat())
    by_source: dict = {}
    for d in deals:
        src = d.get("source_type", "other")
        by_source[src] = by_source.get(src, 0) + 1

    return {
        "total_deals": total,
        "active_deals": active,
        "today_deals": today,
        "by_source": by_source,
    }
