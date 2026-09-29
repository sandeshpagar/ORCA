import pytest
from httpx import AsyncClient
from app.db.models import Profile, UserRoleEnum, Conversation
from app.auth.jwt import create_test_jwt


@pytest.mark.asyncio
async def test_unauthenticated_requests_get_401(client: AsyncClient):
    """Verify that unauthenticated requests to protected endpoints strictly return 401."""
    res_profile = await client.get("/api/profile")
    assert res_profile.status_code == 401

    res_chat = await client.post("/api/chat", json={"query": "Is the sea safe?"})
    assert res_chat.status_code == 401

    res_convs = await client.get("/api/chat/conversations")
    assert res_convs.status_code == 401


@pytest.mark.asyncio
async def test_conversation_object_isolation_blocks_cross_user_access(
    client: AsyncClient, make_token, db_session
):
    """
    CRITICAL OBJECT ISOLATION:
    User B must NEVER be able to read, update, or delete User A's conversation thread.
    Cross-user access attempts must strictly return 403 Forbidden.
    """
    user_a_id = "user-alice-101"
    user_b_id = "user-bob-202"
    token_a = make_token(user_id=user_a_id, email="alice@marine.in")
    token_b = make_token(user_id=user_b_id, email="bob@marine.in")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. User A creates a conversation
    create_res = await client.post(
        "/api/chat/conversations",
        headers=headers_a,
        json={"title": "Alice Confidential Advisory"},
    )
    assert create_res.status_code == 200
    conv_id = create_res.json()["id"]

    # 2. User B tries to read User A's conversation
    get_res = await client.get(f"/api/chat/conversations/{conv_id}", headers=headers_b)
    assert get_res.status_code == 403
    assert "Access denied" in get_res.json()["detail"]

    # 3. User B tries to rename User A's conversation
    patch_res = await client.patch(
        f"/api/chat/conversations/{conv_id}",
        headers=headers_b,
        json={"title": "Hacked Title"},
    )
    assert patch_res.status_code == 403
    assert "Access denied" in patch_res.json()["detail"]

    # 4. User B tries to delete User A's conversation
    del_res = await client.delete(f"/api/chat/conversations/{conv_id}", headers=headers_b)
    assert del_res.status_code == 403
    assert "Access denied" in del_res.json()["detail"]


@pytest.mark.asyncio
async def test_map_layers_role_filtering(client: AsyncClient, make_token, db_session):
    """
    Verify role-based spatial access control:
    - Tourist role receives public leisure/bathing features and NO defense/naval fairways.
    - Authority role receives port authority and security corridors.
    """
    tourist_id = "user-tourist-role"
    authority_id = "user-authority-role"

    token_t = make_token(user_id=tourist_id, email="tourist@example.com")
    token_a = make_token(user_id=authority_id, email="officer@ports.gov.in")

    profile_t = Profile(id=tourist_id, display_name="Tourist", role=UserRoleEnum.TOURIST)
    profile_a = Profile(id=authority_id, display_name="Port Officer", role=UserRoleEnum.AUTHORITY)
    db_session.add_all([profile_t, profile_a])
    await db_session.commit()

    # Query map layers as Tourist
    res_t = await client.get("/api/map-layers", headers={"Authorization": f"Bearer {token_t}"})
    assert res_t.status_code == 200
    t_layers_dict = res_t.json().get("layers", {})
    t_all_features = [f for sublist in t_layers_dict.values() for f in sublist]
    t_names = [f["name"] for f in t_all_features]
    # Defense corridors should not be visible to tourist
    assert not any("Defense" in name or "Security Sector" in name for name in t_names)

    # Query map layers as Authority
    res_a = await client.get("/api/map-layers", headers={"Authorization": f"Bearer {token_a}"})
    assert res_a.status_code == 200
    a_layers_dict = res_a.json().get("layers", {})
    a_all_features = [f for sublist in a_layers_dict.values() for f in sublist]
    a_names = [f["name"] for f in a_all_features]
    # Authority can see port authority and security sectors
    assert any("Port" in name or "Security" in name or "Defense" in name for name in a_names)


@pytest.mark.asyncio
async def test_admin_login_endpoint(client: AsyncClient):
    """Verify server-side admin login endpoint authenticates and issues signed JWT."""
    # 1. Invalid credentials
    bad_res = await client.post(
        "/api/auth/admin-login",
        json={"email": "admin@gmail.com", "password": "WrongPassword!"},
    )
    assert bad_res.status_code == 401

    # 2. Valid credentials
    good_res = await client.post(
        "/api/auth/admin-login",
        json={"email": "admin@gmail.com", "password": "@dminS123"},
    )
    assert good_res.status_code == 200
    data = good_res.json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["email"] == "admin@gmail.com"
    assert data["user"]["isAdmin"] is True


@pytest.mark.asyncio
async def test_admin_endpoints_require_super_admin(client: AsyncClient, make_token):
    """Verify admin endpoints strictly reject non-admin users with 403."""
    regular_token = make_token(user_id="regular-user-id", email="regular@example.com")
    headers_reg = {"Authorization": f"Bearer {regular_token}"}

    # Regular user attempting admin telemetry
    res_tel = await client.get("/api/admin/telemetry", headers=headers_reg)
    assert res_tel.status_code == 403

    # Regular user attempting admin feature-flag toggle
    res_flag = await client.post(
        "/api/admin/feature-flags",
        headers=headers_reg,
        json={"flag": "advanced_gis", "status": "active"},
    )
    assert res_flag.status_code == 403

    # Admin user attempting admin telemetry
    admin_login_res = await client.post(
        "/api/auth/admin-login",
        json={"email": "admin@gmail.com", "password": "@dminS123"},
    )
    admin_token = admin_login_res.json()["token"]
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    res_admin_tel = await client.get("/api/admin/telemetry", headers=headers_admin)
    assert res_admin_tel.status_code == 200
    assert res_admin_tel.json()["status"] == "healthy"
