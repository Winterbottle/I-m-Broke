from fastapi import APIRouter, Query
from typing import Optional
from app.db.client import get_supabase, row_to_deal, row_to_event
from app.models.deal import DealCategory, DealType

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    category: Optional[DealCategory] = None,
    deal_type: Optional[DealType] = None,
    limit: int = Query(20, le=100),
):
    sb = get_supabase()
    search_term = f"%{q}%"

    # Search deals
    deals_q = (
        sb.table("deals_view")
        .select("*")
        .or_(f"title.ilike.{search_term},store_name.ilike.{search_term},description.ilike.{search_term}")
        .eq("is_active", True)
    )
    if category:
        deals_q = deals_q.eq("category", category)
    if deal_type:
        deals_q = deals_q.eq("deal_type", deal_type)

    deals_result = deals_q.order("quality_score", desc=True).limit(limit).execute()

    # Search events
    events_q = (
        sb.table("events_view")
        .select("*")
        .or_(f"title.ilike.{search_term},description.ilike.{search_term},organizer.ilike.{search_term}")
        .eq("is_active", True)
    )
    events_result = events_q.order("start_date", desc=False).limit(10).execute()

    return {
        "deals": [row_to_deal(r) for r in deals_result.data],
        "events": [row_to_event(r) for r in events_result.data],
    }
