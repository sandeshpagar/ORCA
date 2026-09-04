from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.deps import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.db.models import Profile, UserRoleEnum
from app.schemas.profile import ProfileResponse, RoleUpdateRequest, ProfileUpdateRequest

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the authenticated user's profile with authoritative DB-derived role."""
    stmt = select(Profile).where(Profile.id == current_user.user_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.post("/role", response_model=ProfileResponse)
async def set_user_role(
    payload: RoleUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Sets the operational role on first onboarding only.
    SECURITY REQUIREMENT: Role remains LOCKED afterward; cannot be changed once set.
    """
    stmt = select(Profile).where(Profile.id == current_user.user_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # If role has already been chosen (not 'general'), it cannot be changed again
    if profile.role != UserRoleEnum.GENERAL and profile.role != payload.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role assignment is permanent and locked once chosen. Contact administrator to change.",
        )

    profile.role = payload.role
    await db.commit()
    await db.refresh(profile)
    return profile


@router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Updates general profile preferences (display name, language, home coordinates)."""
    stmt = select(Profile).where(Profile.id == current_user.user_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if payload.display_name is not None:
        profile.display_name = payload.display_name
    if payload.language is not None:
        profile.language = payload.language
    if payload.home_region_lat is not None:
        profile.home_region_lat = payload.home_region_lat
    if payload.home_region_lon is not None:
        profile.home_region_lon = payload.home_region_lon
    if payload.home_region_name is not None:
        profile.home_region_name = payload.home_region_name

    await db.commit()
    await db.refresh(profile)
    return profile
