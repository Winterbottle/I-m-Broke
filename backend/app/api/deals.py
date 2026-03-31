from fastapi import APIRouter, Query, HTTPException, Header
from typing import Optional
import os
from app.db.client import get_supabase, row_to_deal
from app.models.deal import DealOut, DealCategory, DealType, SortBy

router = APIRouter(prefix="/deals", tags=["deals"])


@router.get("", response_model=list[DealOut])
async def list_deals(
    category: Optional[DealCategory] = None,
    deal_type: Optional[DealType] = None,
    active_only: bool = False,
    min_quality: int = Query(0, ge=0, le=100),
    sort_by: SortBy = "quality",
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    sb = get_supabase()
    # Use a view that already does ST_X/ST_Y extraction
    q = sb.table("deals_view").select("*")

    if category:
        q = q.eq("category", category)
    if deal_type:
        q = q.eq("deal_type", deal_type)
    if active_only:
        q = q.eq("is_active", True)
    if min_quality:
        q = q.gte("quality_score", min_quality)

    if sort_by == "quality":
        q = q.order("quality_score", desc=True)
    elif sort_by == "recency":
        q = q.order("created_at", desc=True)
    # distance sort requires user coords — handled by /nearby

    q = q.range(offset, offset + limit - 1)
    result = q.execute()
    return [row_to_deal(r) for r in result.data]


@router.get("/nearby", response_model=list[DealOut])
async def nearby_deals(
    lat: float,
    lng: float,
    radius_km: float = Query(2.0, le=50),
    category: Optional[DealCategory] = None,
    deal_type: Optional[DealType] = None,
    active_only: bool = True,
    limit: int = Query(50, le=200),
):
    sb = get_supabase()
    result = sb.rpc(
        "deals_within_radius",
        {"lat": lat, "lng": lng, "radius_km": radius_km},
    ).execute()

    rows = result.data or []

    # Apply in-memory filters (PostGIS already handles distance)
    if category:
        rows = [r for r in rows if r.get("category") == category]
    if deal_type:
        rows = [r for r in rows if r.get("deal_type") == deal_type]
    if active_only:
        rows = [r for r in rows if r.get("is_active")]

    rows = rows[:limit]

    # Add distance_km
    output = []
    for r in rows:
        deal = row_to_deal(r)
        # distance_m returned by PostGIS function
        if "distance_m" in r:
            deal["distance_km"] = round(r["distance_m"] / 1000, 2)
        output.append(deal)
    return output


@router.get("/{deal_id}", response_model=DealOut)
async def get_deal(deal_id: str):
    sb = get_supabase()
    result = sb.table("deals_view").select("*").eq("id", deal_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Deal not found")
    return row_to_deal(result.data)


@router.post("/{deal_id}/view")
async def track_view(deal_id: str):
    sb = get_supabase()
    sb.rpc("increment_view", {"deal_id": deal_id}).execute()
    return {"ok": True}


@router.post("/{deal_id}/click")
async def track_click(deal_id: str):
    sb = get_supabase()
    sb.rpc("increment_click", {"deal_id": deal_id}).execute()
    return {"ok": True}
