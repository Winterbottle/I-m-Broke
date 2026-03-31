from fastapi import APIRouter, Query
from typing import Optional
from app.db.client import get_supabase, row_to_event
from app.models.deal import EventOut

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=list[EventOut])
async def list_events(
    category: Optional[str] = None,
    student_only: bool = False,
    active_only: bool = True,
    limit: int = Query(30, le=100),
    offset: int = 0,
):
    sb = get_supabase()
    q = sb.table("events_view").select("*")

    if category:
        q = q.ilike("category", f"%{category}%")
    if student_only:
        q = q.eq("is_student_eligible", True)
    if active_only:
        q = q.eq("is_active", True)

    q = q.order("start_date", desc=False).range(offset, offset + limit - 1)
    result = q.execute()
    return [row_to_event(r) for r in result.data]


@router.get("/{event_id}", response_model=EventOut)
async def get_event(event_id: str):
    from fastapi import HTTPException
    sb = get_supabase()
    result = sb.table("events_view").select("*").eq("id", event_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return row_to_event(result.data)
