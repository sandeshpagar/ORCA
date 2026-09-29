import asyncio
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging
from app.config import settings
from app.schemas.chat import MarineMetrics, DataSourceInfo
from app.adapters.cache import telemetry_cache

logger = logging.getLogger(__name__)


class OpenMeteoError(Exception):
    """Raised when external Open-Meteo API query fails."""
    pass


WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


async def fetch_open_meteo_marine_data(
    latitude: float,
    longitude: float,
    client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """
    Fetches real-time marine and meteorological observation from Open-Meteo APIs.
    Per docs/01_PRD.md §8: Returns honest LIVE data with attribution, or serves
    stale cached telemetry with explicit CACHED label, or raises OpenMeteoError
    if no cache exists — NEVER invents or fabricates fake measurements.
    """
    cache_key = f"{round(latitude, 2)}:{round(longitude, 2)}"

    # 1. Fresh cache check
    fresh_entry = telemetry_cache.get(cache_key)
    if fresh_entry is not None:
        return fresh_entry

    weather_url = "https://api.open-meteo.com/v1/forecast"
    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
    }

    marine_url = "https://marine-api.open-meteo.com/v1/marine"
    marine_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "wave_height,wave_direction,wave_period",
    }

    should_close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=settings.OPEN_METEO_TIMEOUT_SECONDS)
        should_close_client = True

    try:
        weather_task = client.get(weather_url, params=weather_params)
        marine_task = client.get(marine_url, params=marine_params)
        weather_resp, marine_resp_result = await asyncio.gather(weather_task, marine_task, return_exceptions=True)

        if isinstance(weather_resp, Exception):
            raise OpenMeteoError(f"Open-Meteo Weather API request failed: {weather_resp}") from weather_resp

        weather_resp.raise_for_status()
        try:
            weather_data = weather_resp.json()
        except Exception as json_err:
            raise OpenMeteoError(f"Open-Meteo malformed weather JSON: {json_err}") from json_err

        if not isinstance(weather_data, dict):
            raise OpenMeteoError("Open-Meteo returned invalid weather payload structure")

        marine_data = {}
        if not isinstance(marine_resp_result, Exception) and hasattr(marine_resp_result, "status_code") and marine_resp_result.status_code == 200:
            try:
                m_json = marine_resp_result.json()
                if isinstance(m_json, dict):
                    marine_data = m_json
            except Exception:
                pass

        # Parse observations
        current_weather = weather_data.get("current", {}) or {}
        temp = current_weather.get("temperature_2m")
        wind_speed = current_weather.get("wind_speed_10m")
        wind_dir = current_weather.get("wind_direction_10m")
        wcode = current_weather.get("weather_code", 0)
        weather_desc = WEATHER_CODES.get(wcode, f"Weather Code {wcode}")

        current_marine = marine_data.get("current", {}) or {}
        wave_height = current_marine.get("wave_height")
        wave_period = current_marine.get("wave_period")

        obs_time = current_weather.get("time") or datetime.now(timezone.utc).isoformat()

        metrics = MarineMetrics(
            temperature_c=temp,
            wind_speed_kmh=wind_speed,
            wind_direction_deg=wind_dir,
            wave_height_m=wave_height,
            wave_period_s=wave_period,
            weather_description=weather_desc,
        )

        data_source = DataSourceInfo(
            name="Open-Meteo Marine & Weather API",
            type="weather",
            reliability="LIVE",
            timestamp=str(obs_time),
            attribution="Open-Meteo Global Marine & Weather Models (CC-BY 4.0)",
        )

        live_result = {
            "metrics": metrics,
            "data_source": data_source,
            "is_live": True,
        }

        # Store in bounded TTL cache
        telemetry_cache.set(cache_key, live_result, ttl=900.0)
        return live_result

    except Exception as upstream_err:
        logger.warning("Upstream Open-Meteo query failed for (%s, %s): %s", latitude, longitude, upstream_err)

        # 2. Check for stale cache fallback
        stale_data, age_seconds = telemetry_cache.get_stale(cache_key)
        if stale_data is not None:
            age_mins = round(age_seconds / 60.0, 1)
            orig_ds = stale_data["data_source"]
            stale_ds = DataSourceInfo(
                name=orig_ds.name,
                type=orig_ds.type,
                reliability="CACHED",
                timestamp=orig_ds.timestamp,
                attribution=f"Cached observation ({age_mins}m old); live sensor stream temporarily offline.",
            )
            return {
                "metrics": stale_data["metrics"],
                "data_source": stale_ds,
                "is_live": False,
            }

        # 3. Honest failure if no cache exists
        if isinstance(upstream_err, OpenMeteoError):
            raise upstream_err
        raise OpenMeteoError(f"Failed to retrieve marine observation: {str(upstream_err)}") from upstream_err

    finally:
        if should_close_client:
            await client.aclose()

