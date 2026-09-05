import pytest
from unittest.mock import patch
from httpx import AsyncClient
from app.db.models import Profile, UserRoleEnum
from app.adapters.open_meteo import OpenMeteoError
from app.schemas.chat import MarineMetrics, DataSourceInfo


@pytest.mark.asyncio
async def test_chat_endpoint_schema_with_mocked_live_data(client: AsyncClient, make_token, db_session):
    user_id = "user-chat-tourist"
    token = make_token(user_id=user_id, email="tourist@beach.in")

    # Set up user as tourist in DB
    profile = Profile(
        id=user_id,
        display_name="Puri Traveler",
        role=UserRoleEnum.TOURIST,
        home_region_lat=19.81,
        home_region_lon=85.83,
        home_region_name="Puri Beach",
    )
    db_session.add(profile)
    await db_session.commit()

    headers = {"Authorization": f"Bearer {token}"}
    mock_metrics = MarineMetrics(
        temperature_c=28.5,
        wind_speed_kmh=18.0,
        wind_direction_deg=190.0,
        wave_height_m=1.2,
        wave_period_s=7.5,
        weather_description="Partly cloudy",
    )
    mock_source = DataSourceInfo(
        name="Open-Meteo Marine & Weather API",
        type="weather",
        reliability="LIVE",
        timestamp="2026-09-04T08:00:00Z",
        attribution="Open-Meteo Global Marine Models (CC-BY 4.0)",
    )

    with patch(
        "app.graph.nodes.weather.fetch_open_meteo_marine_data",
        return_value={"metrics": mock_metrics, "data_source": mock_source, "is_live": True},
    ), patch(
        "app.graph.nodes.ocean.fetch_open_meteo_marine_data",
        return_value={"metrics": mock_metrics, "data_source": mock_source, "is_live": True},
    ):
        response = await client.post(
            "/chat",
            headers=headers,
            json={
                "query": "Can I go swimming at Puri beach this morning?",
                "selected_model": "deterministic",
            },
        )

    assert response.status_code == 200
    data = response.json()

    # Verify response schema fields
    assert "reply" in data
    assert "data_source" in data
    assert "metrics" in data
    assert "safety_verdict" in data
    assert "user_role" in data
    assert "conversation_id" in data
    assert "created_at" in data
    assert "model_used" in data

    # Check content values
    assert data["safety_verdict"] == "safe"
    assert data["user_role"] == "tourist"
    assert data["is_live"] is True
    assert data["data_source"]["reliability"] == "LIVE"
    assert data["metrics"]["wave_height_m"] == 1.2
    assert "Tourist Advisory" in data["reply"]


@pytest.mark.asyncio
async def test_chat_data_honesty_on_external_failure(client: AsyncClient, make_token, db_session):
    """
    DATA HONESTY TEST:
    When the external Open-Meteo API fails, the backend must NOT invent fake numbers.
    It returns metrics=None, safety_verdict='unknown', and an explicit limitation disclaimer.
    """
    user_id = "user-chat-fisher"
    token = make_token(user_id=user_id, email="captain@boat.in")

    profile = Profile(
        id=user_id,
        display_name="Captain Rao",
        role=UserRoleEnum.FISHER,
    )
    db_session.add(profile)
    await db_session.commit()

    headers = {"Authorization": f"Bearer {token}"}

    with patch(
        "app.graph.nodes.weather.fetch_open_meteo_marine_data",
        side_effect=OpenMeteoError("Connection timed out to Open-Meteo server"),
    ), patch(
        "app.graph.nodes.ocean.fetch_open_meteo_marine_data",
        side_effect=OpenMeteoError("Connection timed out to Open-Meteo server"),
    ):
        response = await client.post(
            "/chat",
            headers=headers,
            json={
                "query": "What is the wave height at Gopalpur?",
                "selected_model": "deterministic",
            },
        )

    assert response.status_code == 200
    data = response.json()

    # Assert honest handling
    assert data["metrics"] is None  # MUST NOT invent fake metrics
    assert data["safety_verdict"] == "unknown"
    assert data["is_live"] is False
    assert data["data_source"]["reliability"] == "DEMO"
    assert "zero fabricated measurements" in data["data_source"]["attribution"].lower()
    assert "could not be retrieved" in data["reply"].lower()
