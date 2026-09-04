from typing import Dict, Any
from app.graph.state import AgentState
from app.adapters.open_meteo import fetch_open_meteo_marine_data, OpenMeteoError


async def ocean_node(state: AgentState) -> Dict[str, Any]:
    """
    Ocean Specialist Node:
    Fetches real-time oceanographic observations (wave height, wave period, sea condition).
    Per architecture spec, this specialist is SKIPPED for non-marine activities such as sightseeing.
    """
    selected = state.get("selected_tools") or ["ocean"]
    if "ocean" not in selected:
        # Crucial: sightseeing skips ocean!
        return {"ocean_result": None}

    loc = state.get("location", {})
    lat = loc.get("latitude", 19.31)
    lon = loc.get("longitude", 84.91)

    sources = list(state.get("sources", []))
    errors = list(state.get("errors", []))

    try:
        data = await fetch_open_meteo_marine_data(latitude=lat, longitude=lon)
        metrics = data["metrics"]

        # Deterministic sea state categorization
        wh = metrics.wave_height_m or 0.0
        if wh >= 2.5:
            sea_state = "Rough"
        elif wh >= 1.5:
            sea_state = "Moderate"
        else:
            sea_state = "Calm"

        ocean_res = {
            "wave_height_m": metrics.wave_height_m,
            "wave_period_s": metrics.wave_period_s,
            "sea_state": sea_state,
            "sst_c": metrics.temperature_c,
            "is_live": data.get("is_live", True),
        }

        sources.append({
            "name": "INCOIS Coastal Buoy / Open-Meteo Marine",
            "type": "ocean",
            "reliability": "LIVE" if data.get("is_live") else "DEMO",
            "timestamp": data["data_source"].timestamp,
            "attribution": "Global Ocean Wave and Swell Model (ECMWF/Open-Meteo)",
        })

        return {
            "ocean_result": ocean_res,
            "sources": sources,
        }

    except OpenMeteoError as e:
        errors.append(f"Ocean Specialist: {str(e)}")
        sources.append({
            "name": "Open-Meteo Marine Model",
            "type": "ocean",
            "reliability": "DEMO",
            "timestamp": "Unavailable",
            "attribution": "Marine sensor feed unreachable.",
        })
        return {
            "ocean_result": None,
            "sources": sources,
            "errors": errors,
        }
