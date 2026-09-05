from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

from app.auth.jwt import verify_supabase_jwt, JWTVerificationError
from app.db.session import get_db
from app.db.models import Profile, UserRoleEnum

security = HTTPBearer(auto_error=True)


class AuthenticatedUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    email: Optional[str] = None
    role: UserRoleEnum  # DERIVED STRICTLY FROM DB PROFILES TABLE — NEVER TRUST CLIENT
    display_name: Optional[str] = None
    language: str = "en"
    home_region_lat: Optional[float] = 19.31
    home_region_lon: Optional[float] = 84.91
    home_region_name: Optional[str] = "Gopalpur Sector"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> AuthenticatedUser:
    """
    Verifies Supabase JWT and derives user_id + role from the `profiles` table.
    SECURITY PRINCIPLE: Never trust a role passed by the client in headers or payload.
    The role is authoritative only when fetched from the server database.
    """
    token = credentials.credentials
    try:
        payload = verify_supabase_jwt(token)
    except JWTVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    email = payload.get("email")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid JWT: missing user id claim.",
        )

    # Query profiles table to derive the authoritative user role
    stmt = select(Profile).where(Profile.id == user_id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()

    if not profile:
        # First-time user: create profile with initial default role 'general'
        profile = Profile(
            id=user_id,
            display_name=email.split("@")[0] if email else "Officer",
            role=UserRoleEnum.GENERAL,
            language="en",
            home_region_lat=19.31,
            home_region_lon=84.91,
            home_region_name="Gopalpur Sector",
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return AuthenticatedUser(
        user_id=profile.id,
        email=email,
        role=profile.role,  # Derived strictly from DB
        display_name=profile.display_name,
        language=profile.language or "en",
        home_region_lat=profile.home_region_lat,
        home_region_lon=profile.home_region_lon,
        home_region_name=profile.home_region_name,
    )


def require_role(allowed_roles: List[UserRoleEnum]):
    """Enforces that the authenticated user's DB-derived role is in allowed_roles."""
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{current_user.role.value}' lacks required permissions.",
            )
        return current_user

    return role_checker


async def get_current_user_and_role(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> tuple[str, str]:
    """Convenience dependency returning (user_id, role_string)."""
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    return current_user.user_id, role_str


optional_security = HTTPBearer(auto_error=False)


async def get_optional_user_and_role(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    db: AsyncSession = Depends(get_db),
) -> tuple[str, str]:
    """
    Returns (user_id, role) with graceful fallback for public/demo GIS viewport exploration.
    If valid JWT is supplied, derives authoritative role strictly from DB.
    If demo token or absent, gracefully defaults to 'tourist' or provided demo role.
    """
    if not credentials or not credentials.credentials or credentials.credentials in ["null", "undefined"]:
        return "demo_guest", UserRoleEnum.TOURIST.value

    token = credentials.credentials
    valid_roles = {r.value for r in UserRoleEnum}
    if token in valid_roles:
        return f"demo_{token}", token

    try:
        payload = verify_supabase_jwt(token)
        user_id = payload.get("sub")
        if user_id:
            stmt = select(Profile).where(Profile.id == user_id)
            result = await db.execute(stmt)
            profile = result.scalar_one_or_none()
            if profile:
                role_val = profile.role.value if hasattr(profile.role, "value") else str(profile.role)
                return profile.id, role_val
    except Exception:
        pass

    return "demo_guest", UserRoleEnum.TOURIST.value


