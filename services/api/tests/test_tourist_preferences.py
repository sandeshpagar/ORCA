import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tourist_preferences_crud(client: AsyncClient, make_token):
    user_id = "user-tourist-crud"
    token = make_token(user_id=user_id, email="tourist@beach.in")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initial read: empty list of activities
    get_res = await client.get("/api/profile/tourist-preferences", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["activities"] == []

    # 2. Create preferences: beach_visit and boating
    post_res = await client.post(
        "/api/profile/tourist-preferences",
        headers=headers,
        json={
            "activities": ["beach_visit", "boating"],
            "travel_style": "adventure",
            "language": "Hindi",
        },
    )
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["activities"] == ["beach_visit", "boating"]
    assert data["travel_style"] == "adventure"
    assert data["language"] == "Hindi"

    # 3. Update preferences: add water_recreation and sightseeing
    put_res = await client.put(
        "/api/profile/tourist-preferences",
        headers=headers,
        json={
            "activities": ["beach_visit", "boating", "sightseeing", "water_recreation"],
            "travel_style": "family",
        },
    )
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert len(updated_data["activities"]) == 4
    assert "water_recreation" in updated_data["activities"]
    assert updated_data["travel_style"] == "family"


@pytest.mark.asyncio
async def test_tourist_preferences_invalid_activity_rejected(client: AsyncClient, make_token):
    user_id = "user-invalid-act"
    token = make_token(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post(
        "/api/profile/tourist-preferences",
        headers=headers,
        json={"activities": ["deep_sea_drilling"]},  # Invalid activity
    )
    assert res.status_code == 422
    assert "Invalid activity" in res.json()["detail"]
