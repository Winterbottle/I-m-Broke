from fastapi import APIRouter, HTTPException
from app.db.client import get_supabase
from app.models.deal import DealSubmissionIn, DealSubmissionOut

router = APIRouter(prefix="/submit", tags=["submit"])


@router.post("/deal", response_model=DealSubmissionOut)
async def submit_deal(data: DealSubmissionIn):
    sb = get_supabase()

    payload = {
        "store_name": data.store_name,
        "deal_title": data.deal_title,
        "description": data.description,
        "discount_text": data.discount_text,
        "address": data.address,
        "deal_type": data.deal_type,
        "category": data.category,
        "expires_at": data.expires_at,
        "source_url": str(data.source_url) if data.source_url else None,
        "submitter_email": data.submitter_email,
        "status": "pending",
    }

    result = sb.table("deal_submissions").insert(payload).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save submission")

    return DealSubmissionOut(
        id=result.data[0]["id"],
        message="Deal submitted successfully! It will be reviewed within 24 hours.",
    )


@router.get("/stats")
async def get_stats():
    sb = get_supabase()

    deals_result = sb.table("deals_view").select("category, is_active", count="exact").execute()
    events_result = sb.table("events_view").select("id", count="exact").eq("is_active", True).execute()

    rows = deals_result.data or []
    total = len(rows)
    active = sum(1 for r in rows if r.get("is_active"))

    categories: dict = {}
    for r in rows:
        cat = r.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1

    from datetime import datetime, timezone
    return {
        "total_deals": total,
        "active_deals": active,
        "total_events": events_result.count or 0,
        "categories": categories,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
