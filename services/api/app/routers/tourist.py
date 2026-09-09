from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.deps import get_current_user, AuthenticatedUser, get_optional_user_and_role
from app.db.session import get_db
from app.db.models import TouristPreference
from app.schemas.tourist import (
    TouristPreferenceCreate,
    TouristPreferenceUpdate,
    TouristPreferenceResponse,
    VALID_ACTIVITIES,
)

router = APIRouter(prefix="/profile/tourist-preferences", tags=["Tourist Preferences"])


@router.get("", response_model=TouristPreferenceResponse)
async def get_tourist_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves the authenticated user's tourist preferences."""
    stmt = select(TouristPreference).where(TouristPreference.user_id == current_user.user_id)
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()

    if not pref:
        # Return default empty record
        pref = TouristPreference(
            user_id=current_user.user_id,
            activities=[],
            travel_style="leisure",
            language=current_user.language or "English",
        )
        db.add(pref)
        await db.commit()
        await db.refresh(pref)

    return pref


@router.post("", response_model=TouristPreferenceResponse)
async def create_or_update_tourist_preferences(
    payload: TouristPreferenceCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Saves initial or updated tourist onboarding preferences.
    Activities must be a subset of valid activities.
    """
    for act in payload.activities:
        if act not in VALID_ACTIVITIES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid activity '{act}'. Valid activities are: {', '.join(sorted(VALID_ACTIVITIES))}",
            )

    stmt = select(TouristPreference).where(TouristPreference.user_id == current_user.user_id)
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()

    if pref:
        pref.activities = payload.activities
        if payload.travel_style:
            pref.travel_style = payload.travel_style
        if payload.language:
            pref.language = payload.language
    else:
        pref = TouristPreference(
            user_id=current_user.user_id,
            activities=payload.activities,
            travel_style=payload.travel_style or "leisure",
            language=payload.language or "English",
        )
        db.add(pref)

    await db.commit()
    await db.refresh(pref)
    return pref


@router.put("", response_model=TouristPreferenceResponse)
async def update_tourist_preferences(
    payload: TouristPreferenceUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partially updates tourist preferences."""
    stmt = select(TouristPreference).where(TouristPreference.user_id == current_user.user_id)
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()

    if not pref:
        raise HTTPException(status_code=404, detail="Tourist preferences not found")

    if payload.activities is not None:
        for act in payload.activities:
            if act not in VALID_ACTIVITIES:
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid activity '{act}'. Valid activities are: {', '.join(sorted(VALID_ACTIVITIES))}",
                )
        pref.activities = payload.activities
    if payload.travel_style is not None:
        pref.travel_style = payload.travel_style
    if payload.language is not None:
        pref.language = payload.language

    await db.commit()
    await db.refresh(pref)
    return pref


from pydantic import BaseModel, Field
from app.agents.tourist_planner import tourist_planner, TouristTripPlan


class TouristPlanRequest(BaseModel):
    destination: Optional[str] = Field(default=None, description="Destination or beach name")
    region_name: Optional[str] = Field(default=None, description="Alias for destination")
    latitude: Optional[float] = Field(default=19.31, description="Target latitude")
    longitude: Optional[float] = Field(default=84.91, description="Target longitude")
    activity: Optional[str] = Field(default=None, description="Planned coastal activity")
    preferred_activity: Optional[str] = Field(default=None, description="Alias for activity")
    days: Optional[int] = Field(default=3, ge=1, le=5, description="Number of days to forecast (1-5)")


plan_router = APIRouter(prefix="/tourist", tags=["Tourist Planning"])


@plan_router.post("/plan", response_model=TouristTripPlan)
async def plan_tourist_trip(
    payload: TouristPlanRequest = TouristPlanRequest(),
    user_auth: tuple[str, str] = Depends(get_optional_user_and_role),
):
    """
    Phase 4B: Generates a 3-day time-windowed coastal activity plan
    evaluating Morning, Afternoon, and Evening suitability windows.
    Accessible with optional authentication (supports public/demo exploration & authenticated users).
    """
    dest = payload.destination or payload.region_name or "Gopalpur Beach"
    act = payload.activity or payload.preferred_activity or "beach_visit"
    plan = await tourist_planner.generate_plan(
        destination_name=dest,
        latitude=payload.latitude if payload.latitude is not None else 19.31,
        longitude=payload.longitude if payload.longitude is not None else 84.91,
        activity=act,
        days=payload.days or 3,
    )
    return plan
