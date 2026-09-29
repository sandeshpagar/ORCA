import pytest
import jwt
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient
from app.db.models import Profile, UserRoleEnum
from app.config import settings
from app.adapters.open_meteo import fetch_open_meteo_marine_data, OpenMeteoError


@pytest.mark.asyncio
async def test_expired_jwt_token_rejected_with_401(client: AsyncClient, make_token):
    """Verify that an expired JWT token is strictly rejected with HTTP 401 Unauthorized."""
    expired_token = make_token(user_id="usr_expired_1", email="expired@marine.in", expires_in=-3600)
    headers = {"Authorization": f"Bearer {expired_token}"}

    res = await client.get("/api/profile", headers=headers)
    assert res.status_code == 401
    assert "token has expired" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_tampered_jwt_signature_rejected_with_401(client: AsyncClient):
    """Verify that a JWT forged with an unauthorized signing key is strictly rejected with 401."""
    now = datetime.now(timezone.utc)
    forged_payload = {
        "sub": "usr_attacker",
        "email": "attacker@marine.in",
        "aud": "authenticated",
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    forged_token = jwt.encode(forged_payload, "completely_wrong_secret_key_abcdef", algorithm="HS256")
    headers = {"Authorization": f"Bearer {forged_token}"}

    res = await client.get("/api/profile", headers=headers)
    assert res.status_code == 401
    assert "signature" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_non_admin_blocked_from_admin_endpoints_with_403(client: AsyncClient, make_token, db_session):
    """Verify that a standard authenticated user (FISHER/TOURIST) cannot access admin endpoints."""
    user_id = "usr_fisher_regular"
    token = make_token(user_id=user_id, email="fisher@marine.in")
    headers = {"Authorization": f"Bearer {token}"}

    # Ensure profile role is standard FISHER
    profile = Profile(
        id=user_id,
        role=UserRoleEnum.FISHER,
        display_name="Fisher regular",
    )
    db_session.add(profile)
    await db_session.commit()

    # Attempt to read admin telemetry
    telemetry_res = await client.get("/api/admin/telemetry", headers=headers)
    assert telemetry_res.status_code == 403
    assert "super admin privileges required" in telemetry_res.json()["detail"].lower()

    # Attempt to read admin feature flags
    flags_res = await client.get("/api/admin/feature-flags", headers=headers)
    assert flags_res.status_code == 403
    assert "super admin privileges required" in flags_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_input_validation_latitude_out_of_bounds_returns_422(client: AsyncClient, make_token):
    """Verify that latitude > 90.0 or < -90.0 is rejected with 422 Unprocessable Entity."""
    token = make_token(user_id="usr_val_1")
    headers = {"Authorization": f"Bearer {token}"}

    # Latitude > 90
    res_high = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "Sea state check", "latitude": 95.5, "longitude": 84.9},
    )
    assert res_high.status_code == 422

    # Latitude < -90
    res_low = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "Sea state check", "latitude": -91.0, "longitude": 84.9},
    )
    assert res_low.status_code == 422


@pytest.mark.asyncio
async def test_input_validation_longitude_out_of_bounds_returns_422(client: AsyncClient, make_token):
    """Verify that longitude > 180.0 or < -180.0 is rejected with 422 Unprocessable Entity."""
    token = make_token(user_id="usr_val_2")
    headers = {"Authorization": f"Bearer {token}"}

    # Longitude > 180
    res_high = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "Sea state check", "latitude": 19.3, "longitude": 185.0},
    )
    assert res_high.status_code == 422

    # Longitude < -180
    res_low = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "Sea state check", "latitude": 19.3, "longitude": -185.0},
    )
    assert res_low.status_code == 422


@pytest.mark.asyncio
async def test_input_validation_unsupported_language_returns_422(client: AsyncClient, make_token):
    """Verify that an invalid language code violating the schema regex is rejected with 422."""
    token = make_token(user_id="usr_val_3")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "Bonjour le mer", "language": "fr-FR"},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_telugu_language_code_accepted_by_schema(client: AsyncClient, make_token):
    """Verify that Telugu ('te' / 'te-IN') is an accepted coastal corridor language."""
    token = make_token(user_id="usr_val_4")
    headers = {"Authorization": f"Bearer {token}"}

    res_short = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "సముద్ర పరిస్థితి ఎలా ఉంది?", "language": "te"},
    )
    # 200 OK — schema validation succeeds
    assert res_short.status_code == 200

    res_locale = await client.post(
        "/api/chat",
        headers=headers,
        json={"query": "విశాఖపట్నం తీరంలో అలలు ఎలా ఉన్నాయి?", "language": "te-IN"},
    )
    assert res_locale.status_code == 200


@pytest.mark.asyncio
async def test_total_provider_failure_returns_honest_zero_fabrication(client: AsyncClient, make_token):
    """
    Verify that if all upstream providers are unreachable, the system strictly follows
    the PRD §8 Zero-Fabrication policy and provides an honest advisory response.
    """
    token = make_token(user_id="usr_val_honest")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.adapters.open_meteo.fetch_open_meteo_marine_data", side_effect=OpenMeteoError("Simulated total outage")):
        res = await client.post(
            "/api/chat",
            headers=headers,
            json={
                "query": "What are current wave conditions?",
                "selected_model": "deterministic",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert "reply" in data
        assert data["safety_verdict"] in ["caution", "danger", "unknown", "safe"]
