from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.db.models import UserRoleEnum


class RoleUpdateRequest(BaseModel):
    role: UserRoleEnum = Field(..., description="Target operational role enum")


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    language: Optional[str] = None
    home_region_lat: Optional[float] = None
    home_region_lon: Optional[float] = None
    home_region_name: Optional[str] = None


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: Optional[str]
    role: UserRoleEnum
    language: str
    home_region_lat: Optional[float]
    home_region_lon: Optional[float]
    home_region_name: Optional[str]
    created_at: datetime
    updated_at: datetime
