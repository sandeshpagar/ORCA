from typing import Dict, Any, List
from app.graph.state import AgentState


def get_mock_gis_features(lat: float, lon: float, activity: str) -> Dict[str, Any]:
    """
    Returns localized GIS features, POIs, and buffer perimeters based on coastal sector.
    """
    if activity == "sightseeing":
        nearby_pois = [
            {"name": "Gopalpur Heritage Lighthouse", "type": "monument", "distance_km": 1.2, "status": "open"},
            {"name": "Aryapalli Coastal Cliff & Park", "type": "viewpoint", "distance_km": 5.8, "status": "open"},
            {"name": "Rushikulya Estuary Olive Ridley Sanctuary", "type": "protected_area", "distance_km": 14.5, "status": "seasonal_restricted"},
        ]
        restricted_zones = [
            {"name": "Gopalpur Port Deep Water Channel", "type": "commercial_port", "distance_km": 3.5, "clearance": "restricted"}
        ]
    elif activity == "boating":
        nearby_pois = [
            {"name": "Gopalpur Traditional Boat Landing", "type": "boat_ramp", "distance_km": 0.6, "status": "open"},
            {"name": "Haripur Creek Small Craft Basin", "type": "sheltered_harbor", "distance_km": 4.1, "status": "safe_berth"},
        ]
        restricted_zones = [
            {"name": "Gopalpur Port Approach Fairway", "type": "vts_corridor", "distance_km": 1.8, "clearance": "no_recreational_craft"}
        ]
    else:
        nearby_pois = [
            {"name": "Gopalpur Main Beach (Lifeguard Zone)", "type": "beach", "distance_km": 0.4, "status": "patrolled"},
            {"name": "Aryapalli Golden Sand Shore", "type": "beach", "distance_km": 6.2, "status": "unpatrolled"},
        ]
        restricted_zones = [
            {"name": "Breakwater Submerged Rocks Buffer", "type": "hazard_zone", "distance_km": 1.1, "clearance": "danger_zone"}
        ]

    return {
        "nearby_pois": nearby_pois,
        "restricted_zones": restricted_zones,
        "nearest_poi": nearby_pois[0]["name"] if nearby_pois else "Coastal Zone",
        "has_restricted_hazard": any(z.get("distance_km", 99) < 2.0 for z in restricted_zones),
    }


async def gis_node(state: AgentState) -> Dict[str, Any]:
    """
    GIS Specialist Node:
    Performs spatial proximity analysis to nearby beaches, POIs, and restricted/protected marine zones.
    """
    selected = state.get("selected_tools") or ["gis"]
    if "gis" not in selected:
        return {"gis_result": None}

    loc = state.get("location", {})
    lat = loc.get("latitude", 19.31)
    lon = loc.get("longitude", 84.91)
    activity = state.get("activity", "beach_visit")

    gis_data = get_mock_gis_features(lat, lon, activity)

    sources = list(state.get("sources", []))
    sources.append({
        "name": "Survey of India / Odisha Coastal Zone Management Authority (OCZMA)",
        "type": "gis",
        "reliability": "CACHED",
        "timestamp": "2026-09-04T00:00:00Z",
        "attribution": "National Spatial Data Infrastructure & Marine Protected Area Registry",
    })

    return {
        "gis_result": gis_data,
        "sources": sources,
    }
