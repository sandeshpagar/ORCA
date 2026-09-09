import pytest
from httpx import AsyncClient
from app.ingestion.eo_adapter import eo_adapter, EarthObservationAdapter


@pytest.mark.asyncio
async def test_eo_adapter_basin_and_normalization():
    """Verify Arabian Sea vs Bay of Bengal basin detection and sensor metrics."""
    # Bay of Bengal coordinates (Odisha)
    bob_basin = eo_adapter.identify_basin(19.31, 84.91)
    assert bob_basin == "bay_of_bengal"

    # Arabian Sea coordinates (Mumbai)
    as_basin = eo_adapter.identify_basin(18.92, 72.83)
    assert as_basin == "arabian_sea"

    # Normalize data for Odisha
    dataset = await eo_adapter.fetch_and_normalize(19.31, 84.91)
    assert dataset.latitude == 19.31
    assert dataset.longitude == 84.91
    assert "chlorophyll_mg_m3" in dataset.metrics
    assert "temperature_c" in dataset.metrics
    assert "sea_surface_temp_c" in dataset.metrics
    assert "air_temperature_c" in dataset.metrics
    assert "temperatures" in dataset.__dict__
    assert dataset.temperatures["sea_surface_temp_c"] == 28.4
    assert dataset.metrics["chlorophyll_mg_m3"] > 0
    assert len(dataset.provenance) >= 1
    assert dataset.reliability in ["LIVE", "CACHED"]


@pytest.mark.asyncio
async def test_eo_observations_api_endpoint(client: AsyncClient, db_session):
    """Verify GET /api/data-sources/observations/latest returns grounded multi-sensor payload."""
    res = await client.get("/api/data-sources/observations/latest?latitude=18.92&longitude=72.83")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "chlorophyll_mg_m3" in data["metrics"]
    assert "sea_surface_temp_c" in data["metrics"]
    assert "temperatures" in data
    assert data["temperatures"]["sea_surface_temp_c"] == 27.8
    assert "provenance" in data
    assert len(data["provenance"]) >= 1
