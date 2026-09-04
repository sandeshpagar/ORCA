from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.deps import get_current_user, AuthenticatedUser
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
