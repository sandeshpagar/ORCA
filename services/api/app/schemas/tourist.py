from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime

VALID_ACTIVITIES = {
    "beach_visit",
    "boating",
    "sightseeing",
    "water_recreation",
}


class TouristPreferenceCreate(BaseModel):
    activities: List[str] = Field(
        default_factory=list,
        description="List of preferred coastal activities (e.g. beach_visit, boating, sightseeing, water_recreation)",
    )
    travel_style: Optional[str] = Field(default="leisure", description="Travel style preference")
    language: Optional[str] = Field(default="English", description="Language preference")


class TouristPreferenceUpdate(BaseModel):
    activities: Optional[List[str]] = None
    travel_style: Optional[str] = None
    language: Optional[str] = None


class TouristPreferenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    activities: List[str]
    travel_style: str
    language: str
    created_at: datetime
    updated_at: datetime
