import pytest
from httpx import AsyncClient
from app.db.models import Profile, UserRoleEnum


@pytest.mark.asyncio
async def test_role_derived_from_db_not_client_header(client: AsyncClient, make_token, db_session):
    """
    SECURITY TEST:
    A user whose profile in the DB has role 'tourist' must NOT be able
    to elevate their privileges or fool the backend by sending a spoofed
    'X-User-Role' or 'role' parameter in the request headers or body.
    """
    user_id = "user-security-test-1"
    token = make_token(user_id=user_id, email="tourist1@example.com")

    # Seed profile in DB as 'tourist'
    profile = Profile(
        id=user_id,
        display_name="Tourist User",
        role=UserRoleEnum.TOURIST,
    )
    db_session.add(profile)
    await db_session.commit()

    # Client tries to spoof role as 'disaster_management' via header
    headers = {
        "Authorization": f"Bearer {token}",
        "X-User-Role": "disaster_management",
        "Role": "authority",
    }
    response = await client.get("/api/profile", headers=headers)
    assert response.status_code == 200
    data = response.json()

    # Authoritative role must remain 'tourist', completely ignoring client spoofing
    assert data["role"] == "tourist"


@pytest.mark.asyncio
async def test_initial_role_assignment_locks_role(client: AsyncClient, make_token, db_session):
    """
    A newly registered user has role 'general'.
    When they select their operational role on first onboarding, it updates to the chosen role.
    Subsequent attempts to switch the role are rejected and permanently locked.
    """
    user_id = "user-lock-test"
    token = make_token(user_id=user_id, email="cadet@isro.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Profile initially defaults to general
    res1 = await client.get("/api/profile", headers=headers)
    assert res1.status_code == 200
    assert res1.json()["role"] == "general"

    # 2. First onboarding: user selects 'fisher'
    set_res = await client.post("/api/profile/role", headers=headers, json={"role": "fisher"})
    assert set_res.status_code == 200
    assert set_res.json()["role"] == "fisher"

    # 3. Subsequent attempt: user tries to switch to 'researcher' -> MUST BE REJECTED
    switch_res = await client.post("/api/profile/role", headers=headers, json={"role": "researcher"})
    assert switch_res.status_code == 400
    assert "locked" in switch_res.json()["detail"].lower()

    # 4. Verify role is still 'fisher' in DB
    verify_res = await client.get("/api/profile", headers=headers)
    assert verify_res.json()["role"] == "fisher"


@pytest.mark.asyncio
async def test_invalid_role_enum_rejected(client: AsyncClient, make_token):
    """Verifies that non-enum roles like 'maritime_operator' or arbitrary strings are rejected."""
    user_id = "user-invalid-role"
    token = make_token(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post("/api/profile/role", headers=headers, json={"role": "maritime_operator"})
    assert res.status_code == 422  # Unprocessable Entity (Enum validation failure)
