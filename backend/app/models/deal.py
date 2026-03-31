from pydantic import BaseModel, EmailStr, HttpUrl, field_validator
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID


DealCategory = Literal[
    "food", "shopping", "tech", "events",
    "travel", "beauty", "fitness", "entertainment", "other"
]
DealType = Literal["student", "public", "both"]
SourceType = Literal["telegram", "web", "instagram", "submitted", "rss"]
SortBy = Literal["distance", "quality", "recency"]


class LocationOut(BaseModel):
    lat: float
    lng: float
    address: str


class DealOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    store_name: str
    category: DealCategory
    deal_type: DealType
    discount_text: Optional[str] = None
    original_price: Optional[float] = None
    discounted_price: Optional[float] = None
    location: LocationOut
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    source_type: SourceType
    expires_at: Optional[datetime] = None
    is_active: bool
    quality_score: int
    view_count: int
    click_count: int
    is_verified: bool
    distance_km: Optional[float] = None
    created_at: datetime
    updated_at: datetime


class EventOut(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    organizer: Optional[str] = None
    category: str
    location: dict  # {lat, lng, address, venue_name}
    start_date: datetime
    end_date: Optional[datetime] = None
    is_free: bool
    price: Optional[float] = None
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    is_student_eligible: bool
    is_active: bool
    created_at: datetime


class DealSubmissionIn(BaseModel):
    store_name: str
    deal_title: str
    description: Optional[str] = None
    discount_text: Optional[str] = None
    address: str
    deal_type: DealType = "public"
    category: DealCategory = "other"
    expires_at: Optional[str] = None  # date string YYYY-MM-DD
    source_url: Optional[str] = None
    submitter_email: Optional[str] = None

    @field_validator("store_name", "deal_title", "address")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Field cannot be empty")
        return v


class DealSubmissionOut(BaseModel):
    id: str
    message: str


class PlatformStats(BaseModel):
    total_deals: int
    active_deals: int
    total_events: int
    categories: dict
    last_updated: datetime


class RawDealIn(BaseModel):
    """Used internally by scrapers to insert raw deals."""
    title: str
    description: Optional[str] = None
    store_name: str
    category: DealCategory = "other"
    deal_type: DealType = "public"
    discount_text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None
    image_url: Optional[str] = None
    source_url: Optional[str] = None
    source_type: SourceType
    expires_at: Optional[datetime] = None
    raw_text: Optional[str] = None
    quality_score: int = 50
