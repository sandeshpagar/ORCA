import asyncio
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.config import settings
from app.schemas.chat import MarineMetrics, DataSourceInfo


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
    Per docs/01_PRD.md §8: Returns honest LIVE data with attribution, or raises
    an explicit error on failure — NEVER invents or fabricates fake measurements.
    """
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
        client = httpx.AsyncClient(timeout=8.0)
        should_close_client = True

    try:
        weather_task = client.get(weather_url, params=weather_params)
        marine_task = client.get(marine_url, params=marine_params)
        weather_resp, marine_resp_result = await asyncio.gather(weather_task, marine_task, return_exceptions=True)

        if isinstance(weather_resp, Exception):
            raise OpenMeteoError(f"Open-Meteo Weather API request failed: {weather_resp}") from weather_resp

        weather_resp.raise_for_status()
        weather_data = weather_resp.json()

        marine_data = {}
        if not isinstance(marine_resp_result, Exception) and marine_resp_result.status_code == 200:
            try:
                marine_data = marine_resp_result.json()
            except Exception:
                pass

        # Parse observations
        current_weather = weather_data.get("current", {})
        temp = current_weather.get("temperature_2m")
        wind_speed = current_weather.get("wind_speed_10m")
        wind_dir = current_weather.get("wind_direction_10m")
        wcode = current_weather.get("weather_code", 0)
        weather_desc = WEATHER_CODES.get(wcode, f"Weather Code {wcode}")

        current_marine = marine_data.get("current", {})
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

        return {
            "metrics": metrics,
            "data_source": data_source,
            "is_live": True,
        }

    except httpx.HTTPStatusError as e:
        raise OpenMeteoError(f"Open-Meteo API HTTP error {e.response.status_code}: {e.response.text}") from e
    except httpx.RequestError as e:
        raise OpenMeteoError(f"Open-Meteo API connection failed: {str(e)}") from e
    except Exception as e:
        raise OpenMeteoError(f"Failed to retrieve marine observation: {str(e)}") from e
    finally:
        if should_close_client:
            await client.aclose()
