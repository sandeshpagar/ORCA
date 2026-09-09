import pytest
from httpx import AsyncClient
from app.agents.tourist_planner import tourist_planner, MANDATORY_SAFETY_CAVEAT


@pytest.mark.asyncio
async def test_tourist_planner_three_day_generation():
    """Verify that TouristPlanningEngine computes time-windowed suitability across 3 days."""
    plan = await tourist_planner.generate_plan(
        destination_name="Gopalpur Beach",
        latitude=19.31,
        longitude=84.91,
        activity="beach_visit",
        days=3,
    )

    assert plan.destination == "Gopalpur Beach"
    assert plan.date_range_days == 3
    assert len(plan.daily_plans) == 3

    # Check that each day has Morning, Afternoon, Evening windows
    for day in plan.daily_plans:
        assert len(day.windows) == 3
        window_names = [w.window for w in day.windows]
        assert window_names == ["Morning", "Afternoon", "Evening"]
        for w in day.windows:
            assert w.suitability in ["HIGH", "MODERATE", "LOW", "UNSUITABLE"]
            assert 0 <= w.score <= 100
            assert w.wave_height_m > 0
            assert w.wind_speed_kmh > 0
            assert len(w.reasons) > 0

    # Verify mandatory caveat is present (PRD §8)
    assert MANDATORY_SAFETY_CAVEAT in plan.safety_caveat
    assert len(plan.sources) >= 1


@pytest.mark.asyncio
async def test_tourist_plan_api_endpoint(client: AsyncClient, make_token):
    """Verify POST /api/tourist/plan endpoint."""
    token = make_token(user_id="test-tourist-plan-1", email="vacationer@orca.gov.in")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "destination": "Puri Golden Beach",
        "latitude": 19.80,
        "longitude": 85.83,
        "activity": "beach_visit",
        "days": 3,
    }
    res = await client.post("/api/tourist/plan", headers=headers, json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["destination"] == "Puri Golden Beach"
    assert len(data["daily_plans"]) == 3
    assert "safety_caveat" in data
    assert "rip current" in data["safety_caveat"].lower()


@pytest.mark.asyncio
async def test_tourist_plan_unauthenticated_and_aliases(client: AsyncClient):
    """Verify POST /api/tourist/plan works without token and with parameter aliases (region_name, preferred_activity)."""
    payload = {
        "region_name": "Konark Marine Drive",
        "latitude": 19.88,
        "longitude": 86.09,
        "preferred_activity": "sightseeing",
        "days": 2,
    }
    # No Authorization header supplied
    res = await client.post("/api/tourist/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["destination"] == "Konark Marine Drive"
    assert data["activity"] == "sightseeing"
    assert len(data["daily_plans"]) == 2
    assert "safety_caveat" in data
