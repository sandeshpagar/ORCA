"""
Spatial GIS & Map Layer Authorization Tests (Phase 3)
Verifies spatial calculations (haversine, ray-casting, bbox) and ensures
sensitive defense layers are strictly omitted for Tourist roles.
"""

import pytest
from httpx import AsyncClient
from app.spatial.utils import haversine_distance_km, point_in_polygon, bbox_intersects
from app.spatial.seed_data import DEMO_MAP_FEATURES
from app.db.models import Profile, UserRoleEnum


def test_haversine_distance_accuracy():
    """Verify haversine distance against known Odisha coastal coordinates."""
    # Gopalpur to Aryapalli (~8.1 km)
    dist = haversine_distance_km(19.2605, 84.9042, 19.3082, 84.9621)
    assert 7.5 < dist < 8.8

    # Gopalpur to Puri (~115 km)
    dist_puri = haversine_distance_km(19.2605, 84.9042, 19.7925, 85.8236)
    assert 110.0 < dist_puri < 125.0


def test_point_in_polygon_raycasting():
    """Verify ray-casting containment algorithm for marine sanctuaries."""
    # Rushikulya Turtle Sanctuary exterior boundary polygon:
    # [[85.02, 19.35], [85.08, 19.35], [85.10, 19.42], [85.03, 19.42], [85.02, 19.35]]
    sanctuary_coords = [
        [85.0200, 19.3500],
        [85.0800, 19.3500],
        [85.1000, 19.4200],
        [85.0300, 19.4200],
        [85.0200, 19.3500],
    ]

    # Coordinate clearly inside the sanctuary (19.38, 85.05)
    assert point_in_polygon(19.3800, 85.0500, sanctuary_coords) is True

    # Coordinate outside the sanctuary (19.25, 84.90) - Gopalpur
    assert point_in_polygon(19.2500, 84.9000, sanctuary_coords) is False


def test_bbox_intersects():
    """Verify bounding box spatial intersection check."""
    # Bounding box around Gopalpur (lon 84.8 to 85.0, lat 19.2 to 19.4)
    assert bbox_intersects(
        lat=19.2605, lon=84.9042, geometry=None,
        min_lon=84.8, min_lat=19.2, max_lon=85.0, max_lat=19.4,
    ) is True

    # Point in Puri (lon 85.82, lat 19.79) outside Gopalpur bbox
    assert bbox_intersects(
        lat=19.7925, lon=85.8236, geometry=None,
        min_lon=84.8, min_lat=19.2, max_lon=85.0, max_lat=19.4,
    ) is False


@pytest.mark.asyncio
async def test_tourist_cannot_view_restricted_defense_layer(
    client: AsyncClient, db_session, make_token
):
    """
    CRITICAL SECURITY CHECK:
    A Tourist request to /api/map-layers MUST NOT receive classified defense layers.
    """
    user_id = "test-tourist-gis-user"
    profile = Profile(id=user_id, display_name="Tourist Tara", role=UserRoleEnum.TOURIST)
    db_session.add(profile)
    await db_session.commit()

    token = make_token(user_id=user_id)
    response = await client.get("/api/map-layers", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    data = response.json()
    assert data["requesting_user_role"] == "tourist"

    # Flatten all returned features across all layer categories
    all_returned_names = []
    for layer_name, feature_list in data["layers"].items():
        for f in feature_list:
            all_returned_names.append(f["name"])

    # Ensure sensitive defense zone is absent
    assert "Naval Defense Tactical Sector (Bravo-9 Grid)" not in all_returned_names
    # Ensure public tourist beaches ARE present
    assert any("Gopalpur Main Beach" in name for name in all_returned_names)


@pytest.mark.asyncio
async def test_authority_can_view_restricted_defense_layer(
    client: AsyncClient, db_session, make_token
):
    """
    Authorized Port/Naval authority CAN view classified defense grid.
    """
    user_id = "test-authority-gis-user"
    profile = Profile(id=user_id, display_name="Commander Rao", role=UserRoleEnum.AUTHORITY)
    db_session.add(profile)
    await db_session.commit()

    token = make_token(user_id=user_id)
    response = await client.get("/api/map-layers", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

    data = response.json()
    assert data["requesting_user_role"] == "authority"

    all_returned_names = []
    for layer_name, feature_list in data["layers"].items():
        for f in feature_list:
            all_returned_names.append(f["name"])

    assert "Naval Defense Tactical Sector (Bravo-9 Grid)" in all_returned_names


@pytest.mark.asyncio
async def test_spatial_nearby_endpoint(
    client: AsyncClient, db_session, make_token
):
    """Verify radial proximity search around Gopalpur."""
    user_id = "test-nearby-user"
    token = make_token(user_id=user_id)

    # Search within 15 km of Gopalpur (19.2605, 84.9042)
    response = await client.get(
        "/api/spatial/nearby?latitude=19.2605&longitude=84.9042&radius_km=15.0",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()

    names = [r["name"] for r in data["results"]]
    assert any("Gopalpur" in n for n in names)
    assert any("Aryapalli" in n for n in names)
    # Puri should be excluded (it's ~115 km away)
    assert not any("Puri Golden Beach" in n for n in names)


@pytest.mark.asyncio
async def test_spatial_containment_endpoint(
    client: AsyncClient, db_session, make_token
):
    """Verify point-in-polygon containment check."""
    user_id = "test-containment-user"
    token = make_token(user_id=user_id)

    # Coordinate inside Gopalpur Shoals Alert L3 Surge Polygon (19.275, 84.930)
    response = await client.post(
        "/api/spatial/check-containment",
        headers={"Authorization": f"Bearer {token}"},
        json={"latitude": 19.275, "longitude": 84.930},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["is_inside_restricted_or_hazard_zone"] is True
    assert len(data["contained_zones"]) >= 1
    assert any("Surge" in z["name"] or "Breaker" in z["name"] for z in data["contained_zones"])
