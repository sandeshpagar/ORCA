from typing import Dict, Any
from app.graph.state import AgentState
from app.adapters.open_meteo import fetch_open_meteo_marine_data, OpenMeteoError


async def weather_node(state: AgentState) -> Dict[str, Any]:
    """
    Weather Specialist Node:
    Fetches real-time meteorological observations (temperature, wind speed, wind direction, weather code).
    Never fabricates fake data — records honest error if unreachable.
    """
    selected = state.get("selected_tools") or ["weather"]
    if "weather" not in selected:
        return {}

    loc = state.get("location", {})
    lat = loc.get("latitude", 19.31)
    lon = loc.get("longitude", 84.91)

    sources = list(state.get("sources", []))
    errors = list(state.get("errors", []))

    try:
        data = await fetch_open_meteo_marine_data(latitude=lat, longitude=lon)
        metrics = data["metrics"]
        source_info = data["data_source"]

        weather_res = {
            "temperature_c": metrics.temperature_c,
            "wind_speed_kmh": metrics.wind_speed_kmh,
            "wind_direction_deg": metrics.wind_direction_deg,
            "weather_description": metrics.weather_description,
            "is_live": data.get("is_live", True),
        }

        # Append source
        sources.append({
            "name": source_info.name,
            "type": "weather",
            "reliability": source_info.reliability,
            "timestamp": source_info.timestamp,
            "attribution": source_info.attribution,
        })

        return {
            "weather_result": weather_res,
            "sources": sources,
        }

    except OpenMeteoError as e:
        errors.append(f"Weather Specialist: {str(e)}")
        sources.append({
            "name": "Open-Meteo Weather API",
            "type": "weather",
            "reliability": "DEMO",
            "timestamp": "Unavailable",
            "attribution": "Sensor stream offline; zero fabrication policy.",
        })
        return {
            "weather_result": None,
            "sources": sources,
            "errors": errors,
        }
