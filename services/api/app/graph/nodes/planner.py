from typing import Dict, Any, List, Set
from app.graph.state import AgentState


# Tourist activity mapping table mandated by docs/03_System_Architecture.md §2.2
TOURIST_ROUTING: Dict[str, List[str]] = {
    "beach_visit": ["weather", "ocean", "advisory", "gis"],
    "boating": ["weather", "ocean", "advisory", "gis"],
    "sightseeing": ["weather", "gis", "advisory"],  # Skips ocean!
    "water_recreation": ["weather", "ocean", "advisory", "gis"],
}

ROLE_DEFAULT_ROUTING: Dict[str, List[str]] = {
    "fisher": ["weather", "ocean", "advisory"],
    "authority": ["weather", "ocean", "gis", "advisory"],
    "researcher": ["weather", "ocean"],
    "disaster_management": ["weather", "ocean", "gis", "advisory"],
    "general": ["weather", "ocean", "advisory"],
}


def detect_activity_from_query(query: str, current_activity: str | None = None) -> str:
    """Infers tourist activity from query keywords if not already locked."""
    q = query.lower()
    if any(k in q for k in ["sightseeing", "monument", "temple", "lighthouse", "fort", "attractions", "places to see"]):
        return "sightseeing"
    if any(k in q for k in ["trawler", "trawling", "mechanised trawler"]):
        return "trawler_venture"
    if any(k in q for k in ["boat", "boating", "sail", "sailing", "ferry", "cruise", "kayak", "motorboat", "vessel", "craft"]):
        return "boating"
    if any(k in q for k in ["swim", "swimming", "surf", "surfing", "dive", "diving", "snorkeling", "water sport"]):
        return "water_recreation"
    if any(k in q for k in ["beach", "shore", "sand", "coast", "sunbathe", "tide"]):
        return "beach_visit"
    return current_activity or "beach_visit"


def detect_intent(query: str) -> str:
    """Detects query intent (suitability check, risk explanation, conditions summary, etc.)."""
    q = query.lower()
    if any(k in q for k in ["why is", "why are", "explain why", "reason for unsuitable", "why unsuitable"]):
        return "risk_explanation"
    if any(k in q for k in ["is it a good time", "can i go", "is it safe", "suitability", "should i"]):
        return "suitability_check"
    if any(k in q for k in ["more suitable places", "places nearby", "recommend places", "where to"]):
        return "nearby_recommendations"
    return "conditions_advisory"


def plan_query(state: AgentState) -> Dict[str, Any]:
    """
    Planner Node:
    - Analyzes query, role, and activity.
    - Determines required specialist agents per the routing table.
    - Updates intent and activity in graph state.
    """
    query = state.get("user_query", "")
    role = state.get("role", "general")
    current_activity = state.get("activity")

    activity = detect_activity_from_query(query, current_activity)
    intent = detect_intent(query)

    # Determine required tools/specialists based on routing table
    if intent == "risk_explanation":
        # Explaining an unsuitable condition relies on existing risk context
        required_tools = ["risk_context"]
    elif activity == "sightseeing" or "sightseeing" in query.lower() or "monument" in query.lower():
        # Sightseeing strictly skips ocean across all personas per architecture §2.2
        required_tools = ["weather", "gis"] if "places" in query.lower() else ["weather", "gis", "advisory"]
    elif role == "tourist":
        required_tools = list(TOURIST_ROUTING.get(activity, ["weather", "ocean", "advisory", "gis"]))
    else:
        required_tools = list(ROLE_DEFAULT_ROUTING.get(role, ["weather", "ocean", "advisory"]))

    # Derive default time window from query
    time_window = state.get("time_window") or {}
    q_lower = query.lower()
    if "tomorrow morning" in q_lower:
        time_window = {"label": "Tomorrow Morning (06:00 - 11:00 IST)", "offset_hours": 24}
    elif "weekend" in q_lower:
        time_window = {"label": "Upcoming Weekend Window", "offset_hours": 48}
    elif "tonight" in q_lower:
        time_window = {"label": "Tonight (18:00 - 23:00 IST)", "offset_hours": 6}
    else:
        time_window = {"label": "Current Window (Next 6 Hours)", "offset_hours": 0}

    # Location fallback
    loc = state.get("location") or {}
    if not loc.get("latitude"):
        loc = {"name": "Gopalpur Sector", "latitude": 19.31, "longitude": 84.91}

    return {
        "intent": intent,
        "activity": activity,
        "time_window": time_window,
        "location": loc,
        "selected_tools": required_tools,
    }
