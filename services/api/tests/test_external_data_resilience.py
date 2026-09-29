import time
import pytest
from app.adapters.cache import TelemetryCache


def test_ttl_cache_expiry_and_stale_retrieval():
    """Verify TTL cache expires fresh items but preserves stale entries with age."""
    cache = TelemetryCache(maxsize=10, default_ttl_seconds=0.2)
    cache.set("key1", {"temp": 28.5})

    # Fresh hit
    assert cache.get("key1") == {"temp": 28.5}

    # Wait for TTL to expire
    time.sleep(0.25)

    # Fresh miss
    assert cache.get("key1") is None

    # Stale hit
    stale_val, age = cache.get_stale("key1")
    assert stale_val == {"temp": 28.5}
    assert age >= 0.25


def test_ttl_cache_maxsize_lru_eviction():
    """Verify that when cache exceeds maxsize, the oldest accessed items are evicted."""
    cache = TelemetryCache(maxsize=3, default_ttl_seconds=60.0)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)

    assert cache.size() == 3

    # Add 4th item; oldest item 'a' should be evicted
    cache.set("d", 4)
    assert cache.size() == 3
    assert cache.get("a") is None
    assert cache.get_stale("a") == (None, 0.0)
    assert cache.get("b") == 2
    assert cache.get("c") == 3
    assert cache.get("d") == 4


def test_ttl_cache_clear_and_delete():
    """Verify deleting keys and clearing cache works cleanly."""
    cache = TelemetryCache(maxsize=10, default_ttl_seconds=60.0)
    cache.set("k1", "v1")
    cache.set("k2", "v2")

    cache.delete("k1")
    assert cache.get("k1") is None
    assert cache.get("k2") == "v2"

    cache.clear()
    assert cache.size() == 0
    assert cache.get("k2") is None


@pytest.mark.asyncio
async def test_open_meteo_live_fetch_populates_cache():
    """Verify successful Open-Meteo query caches data with LIVE reliability."""
    import httpx
    from unittest.mock import patch, AsyncMock
    from app.adapters.open_meteo import fetch_open_meteo_marine_data
    from app.adapters.cache import telemetry_cache

    telemetry_cache.clear()

    mock_weather = httpx.Response(
        status_code=200,
        json={"current": {"temperature_2m": 29.2, "wind_speed_10m": 16.5, "wind_direction_10m": 180, "weather_code": 1}},
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )
    mock_marine = httpx.Response(
        status_code=200,
        json={"current": {"wave_height": 1.3, "wave_period": 8.0, "wave_direction": 170}},
        request=httpx.Request("GET", "https://marine-api.open-meteo.com/v1/marine"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, side_effect=[mock_weather, mock_marine]):
        data = await fetch_open_meteo_marine_data(latitude=19.31, longitude=84.91)
        assert data["is_live"] is True
        assert data["data_source"].reliability == "LIVE"
        assert data["metrics"].temperature_c == 29.2
        assert data["metrics"].wave_height_m == 1.3

        # Verify entry was populated in cache
        cached = telemetry_cache.get("19.31:84.91")
        assert cached is not None
        assert cached["metrics"].temperature_c == 29.2


@pytest.mark.asyncio
async def test_open_meteo_timeout_falls_back_to_stale_cache():
    """Verify that when external API times out, cached data is served with CACHED badge."""
    import httpx
    from unittest.mock import patch
    from app.adapters.open_meteo import fetch_open_meteo_marine_data
    from app.adapters.cache import telemetry_cache
    from app.schemas.chat import MarineMetrics, DataSourceInfo

    telemetry_cache.clear()
    # Seed cache with prior observation
    metrics = MarineMetrics(temperature_c=28.0, wind_speed_kmh=12.0, wave_height_m=1.1)
    ds = DataSourceInfo(name="Open-Meteo", type="weather", reliability="LIVE", timestamp="2026-09-29T10:00:00Z", attribution="Open-Meteo Live")
    telemetry_cache.set("19.31:84.91", {"metrics": metrics, "data_source": ds, "is_live": True}, ttl=0.1)

    # Allow TTL to expire so it's stale
    time.sleep(0.15)

    with patch("httpx.AsyncClient.get", side_effect=httpx.TimeoutException("Read timeout")):
        fallback_data = await fetch_open_meteo_marine_data(latitude=19.31, longitude=84.91)
        assert fallback_data["is_live"] is False
        assert fallback_data["data_source"].reliability == "CACHED"
        assert "cache" in fallback_data["data_source"].attribution.lower()
        assert fallback_data["metrics"].temperature_c == 28.0


@pytest.mark.asyncio
async def test_open_meteo_http_500_falls_back_to_stale_cache():
    """Verify HTTP 500 server error triggers stale cache fallback."""
    import httpx
    from unittest.mock import patch, AsyncMock
    from app.adapters.open_meteo import fetch_open_meteo_marine_data
    from app.adapters.cache import telemetry_cache
    from app.schemas.chat import MarineMetrics, DataSourceInfo

    telemetry_cache.clear()
    metrics = MarineMetrics(temperature_c=30.0, wind_speed_kmh=10.0, wave_height_m=1.0)
    ds = DataSourceInfo(name="Open-Meteo", type="weather", reliability="LIVE", timestamp="2026-09-29T10:00:00Z", attribution="Open-Meteo Live")
    telemetry_cache.set("19.31:84.91", {"metrics": metrics, "data_source": ds, "is_live": True}, ttl=0.1)

    time.sleep(0.15)

    res_500 = httpx.Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=res_500):
        data = await fetch_open_meteo_marine_data(latitude=19.31, longitude=84.91)
        assert data["is_live"] is False
        assert data["data_source"].reliability == "CACHED"


@pytest.mark.asyncio
async def test_open_meteo_malformed_json_falls_back_to_cache():
    """Verify that HTML 502/Bad Gateway instead of JSON triggers cache fallback without crash."""
    import httpx
    from unittest.mock import patch, AsyncMock
    from app.adapters.open_meteo import fetch_open_meteo_marine_data
    from app.adapters.cache import telemetry_cache
    from app.schemas.chat import MarineMetrics, DataSourceInfo

    telemetry_cache.clear()
    metrics = MarineMetrics(temperature_c=29.0, wind_speed_kmh=15.0, wave_height_m=1.2)
    ds = DataSourceInfo(name="Open-Meteo", type="weather", reliability="LIVE", timestamp="2026-09-29T10:00:00Z", attribution="Open-Meteo Live")
    telemetry_cache.set("19.31:84.91", {"metrics": metrics, "data_source": ds, "is_live": True}, ttl=0.1)

    time.sleep(0.15)

    res_html = httpx.Response(
        status_code=200,
        text="<html><body>502 Bad Gateway</body></html>",
        headers={"Content-Type": "text/html"},
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
    )

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=res_html):
        data = await fetch_open_meteo_marine_data(latitude=19.31, longitude=84.91)
        assert data["is_live"] is False
        assert data["data_source"].reliability == "CACHED"
        assert data["metrics"].temperature_c == 29.0




@pytest.mark.asyncio
async def test_open_meteo_zero_fabrication_when_no_cache_exists():
    """PRD §8 MANDATE: When no cache exists and external API fails, raise OpenMeteoError (never fake values)."""
    import httpx
    from unittest.mock import patch
    from app.adapters.open_meteo import fetch_open_meteo_marine_data, OpenMeteoError
    from app.adapters.cache import telemetry_cache

    telemetry_cache.clear()

    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("Network unreachable")):
        with pytest.raises(OpenMeteoError) as exc_info:
            await fetch_open_meteo_marine_data(latitude=19.31, longitude=84.91)
        assert "failed" in str(exc_info.value).lower() or "unreachable" in str(exc_info.value).lower()


def test_safety_critical_high_wave_alert_never_silently_dropped():
    """Verify that High Wave Alerts and Cyclone signals are prioritized at the top of warnings."""
    from app.graph.nodes.advisory_rag import get_grounding_advisories

    res = get_grounding_advisories(
        query="What are the cyclone signals and high wave warnings today?",
        role="fisher",
        activity="trawler_venture",
    )

    warnings = res.get("warnings", [])
    assert len(warnings) > 0

    # Ensure critical warning (cyclone / high wave / storm) is placed at the top (index 0)
    top_warning = warnings[0].lower()
    assert any(term in top_warning for term in ["cyclon", "high wave", "signal", "danger", "warning", "prohibited"])


