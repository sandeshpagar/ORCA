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


GREETING_WORDS = {
    "hi", "high", "hello", "hey", "namaste", "hola", "sup",
    "good morning", "good evening", "good afternoon", "greetings",
    "who are you", "what can you do", "help", "help me", "start",
}


def is_greeting(query: str) -> bool:
    q = query.strip().lower()
    cleaned = "".join(ch for ch in q if ch.isalnum() or ch.isspace()).strip()
    if cleaned in GREETING_WORDS:
        return True
    if any(cleaned.startswith(k) for k in ["who are you", "what can you do", "what are you", "help me"]):
        return True
    words = cleaned.split()
    if len(words) <= 2 and any(w in GREETING_WORDS for w in words):
        return True
    return False


def detect_activity_from_query(query: str, current_activity: str | None = None) -> str | None:
    """Infers tourist activity from query keywords if not already locked."""
    if is_greeting(query):
        return None
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
    return current_activity or None


# Canonical coastal destination directory across Indian coastline
COASTAL_DESTINATIONS: List[Dict[str, Any]] = [
    # Maharashtra & Mumbai
    {"aliases": ["juhu beach", "juhu"], "name": "Juhu Beach, Mumbai", "latitude": 19.0988, "longitude": 72.8264, "region_id": "maharashtra"},
    {"aliases": ["versova beach", "versova"], "name": "Versova Beach, Mumbai", "latitude": 19.1350, "longitude": 72.8140, "region_id": "maharashtra"},
    {"aliases": ["bandra bandstand", "bandstand", "bandra"], "name": "Bandra Bandstand, Mumbai", "latitude": 19.0430, "longitude": 72.8190, "region_id": "maharashtra"},
    {"aliases": ["girgaon chowpatty", "marine drive", "girgaon", "chowpatty"], "name": "Girgaon Chowpatty & Marine Drive, Mumbai", "latitude": 18.9548, "longitude": 72.8155, "region_id": "maharashtra"},
    {"aliases": ["dadar chowpatty", "dadar beach"], "name": "Dadar Chowpatty, Mumbai", "latitude": 19.0270, "longitude": 72.8360, "region_id": "maharashtra"},
    {"aliases": ["aksa beach", "aksa"], "name": "Aksa Beach, Mumbai", "latitude": 19.1760, "longitude": 72.7950, "region_id": "maharashtra"},
    {"aliases": ["gateway of india", "colaba promenade"], "name": "Gateway of India, Mumbai", "latitude": 18.9220, "longitude": 72.8347, "region_id": "maharashtra"},
    {"aliases": ["alibaug beach", "alibaug", "alibag", "varsoli"], "name": "Alibaug Beach, Maharashtra", "latitude": 18.6414, "longitude": 72.8722, "region_id": "maharashtra"},
    {"aliases": ["kashid beach", "kashid"], "name": "Kashid Beach, Maharashtra", "latitude": 18.4286, "longitude": 72.9056, "region_id": "maharashtra"},
    {"aliases": ["tarkarli beach", "tarkarli", "malvan"], "name": "Tarkarli Beach, Maharashtra", "latitude": 16.0354, "longitude": 73.4912, "region_id": "maharashtra"},
    {"aliases": ["ganpatipule beach", "ganpatipule"], "name": "Ganpatipule Beach, Maharashtra", "latitude": 17.1458, "longitude": 73.2656, "region_id": "maharashtra"},
    {"aliases": ["mumbai", "bombay"], "name": "Mumbai Coastal Sector", "latitude": 18.9548, "longitude": 72.8155, "region_id": "maharashtra"},

    # Goa
    {"aliases": ["calangute beach", "baga beach", "calangute", "baga"], "name": "Calangute & Baga Beach, Goa", "latitude": 15.5439, "longitude": 73.7553, "region_id": "goa"},
    {"aliases": ["anjuna beach", "anjuna"], "name": "Anjuna Beach, Goa", "latitude": 15.5869, "longitude": 73.7437, "region_id": "goa"},
    {"aliases": ["vagator beach", "vagator"], "name": "Vagator Beach, Goa", "latitude": 15.6030, "longitude": 73.7336, "region_id": "goa"},
    {"aliases": ["candolim beach", "candolim"], "name": "Candolim Beach, Goa", "latitude": 15.5170, "longitude": 73.7620, "region_id": "goa"},
    {"aliases": ["miramar beach", "miramar"], "name": "Miramar Beach, Goa", "latitude": 15.4820, "longitude": 73.8070, "region_id": "goa"},
    {"aliases": ["colva beach", "colva"], "name": "Colva Beach, Goa", "latitude": 15.2792, "longitude": 73.9144, "region_id": "goa"},
    {"aliases": ["palolem beach", "palolem"], "name": "Palolem Beach, Goa", "latitude": 15.0100, "longitude": 74.0230, "region_id": "goa"},
    {"aliases": ["goa"], "name": "Goa Coastal Sector", "latitude": 15.4920, "longitude": 73.8180, "region_id": "goa"},

    # Odisha
    {"aliases": ["gopalpur beach", "gopalpur"], "name": "Gopalpur Beach, Odisha", "latitude": 19.2605, "longitude": 84.9042, "region_id": "odisha"},
    {"aliases": ["aryapalli beach", "aryapalli"], "name": "Aryapalli Beach, Odisha", "latitude": 19.3082, "longitude": 84.9621, "region_id": "odisha"},
    {"aliases": ["rushikulya"], "name": "Rushikulya Marine Sanctuary, Odisha", "latitude": 19.3621, "longitude": 85.0841, "region_id": "odisha"},
    {"aliases": ["puri golden beach", "puri beach", "puri"], "name": "Puri Golden Beach, Odisha", "latitude": 19.7983, "longitude": 85.8249, "region_id": "odisha"},
    {"aliases": ["chandrabhaga beach", "chandrabhaga", "konark"], "name": "Chandrabhaga Beach, Konark, Odisha", "latitude": 19.8667, "longitude": 86.1000, "region_id": "odisha"},
    {"aliases": ["odisha", "orissa"], "name": "Odisha Coastal Sector", "latitude": 19.3100, "longitude": 84.9100, "region_id": "odisha"},

    # Tamil Nadu
    {"aliases": ["marina beach", "marina promenade", "marina"], "name": "Marina Beach Promenade, Chennai", "latitude": 13.0500, "longitude": 80.2824, "region_id": "tamil_nadu"},
    {"aliases": ["elliot's beach", "elliot beach", "besant nagar"], "name": "Elliot's Beach, Chennai", "latitude": 12.9996, "longitude": 80.2721, "region_id": "tamil_nadu"},
    {"aliases": ["mahabalipuram", "mamallapuram"], "name": "Mahabalipuram Shore, Tamil Nadu", "latitude": 12.6167, "longitude": 80.1983, "region_id": "tamil_nadu"},
    {"aliases": ["dhanushkodi", "rameshwaram"], "name": "Dhanushkodi Shore, Tamil Nadu", "latitude": 9.1760, "longitude": 79.4180, "region_id": "tamil_nadu"},
    {"aliases": ["kanyakumari"], "name": "Kanyakumari Cape, Tamil Nadu", "latitude": 8.0780, "longitude": 77.5550, "region_id": "tamil_nadu"},
    {"aliases": ["chennai", "madras"], "name": "Chennai Coastal Sector", "latitude": 13.0500, "longitude": 80.2824, "region_id": "tamil_nadu"},

    # Kerala
    {"aliases": ["kovalam beach", "kovalam"], "name": "Kovalam Lighthouse Beach, Kerala", "latitude": 8.4021, "longitude": 76.9787, "region_id": "kerala"},
    {"aliases": ["varkala cliff beach", "varkala beach", "varkala"], "name": "Varkala Cliff Beach, Kerala", "latitude": 8.7330, "longitude": 76.7032, "region_id": "kerala"},
    {"aliases": ["fort kochi", "kochi", "cochin"], "name": "Fort Kochi Coastal Sector, Kerala", "latitude": 9.9650, "longitude": 76.2415, "region_id": "kerala"},
    {"aliases": ["cherai beach", "cherai"], "name": "Cherai Beach, Kerala", "latitude": 10.1415, "longitude": 76.1785, "region_id": "kerala"},
    {"aliases": ["kerala"], "name": "Kerala Coastal Sector", "latitude": 8.4021, "longitude": 76.9787, "region_id": "kerala"},

    # Gujarat
    {"aliases": ["shivrajpur beach", "shivrajpur"], "name": "Shivrajpur Blue Flag Beach, Gujarat", "latitude": 22.3328, "longitude": 68.9556, "region_id": "gujarat"},
    {"aliases": ["dwarka"], "name": "Dwarka Coastal Shore, Gujarat", "latitude": 22.2405, "longitude": 68.9685, "region_id": "gujarat"},
    {"aliases": ["mandvi beach", "mandvi"], "name": "Mandvi Beach, Gujarat", "latitude": 22.8270, "longitude": 69.3490, "region_id": "gujarat"},
    {"aliases": ["gujarat"], "name": "Gujarat Coastal Sector", "latitude": 22.3328, "longitude": 68.9556, "region_id": "gujarat"},

    # Karnataka
    {"aliases": ["panambur beach", "panambur"], "name": "Panambur Beach, Karnataka", "latitude": 12.9536, "longitude": 74.8144, "region_id": "karnataka"},
    {"aliases": ["gokarna", "om beach", "kudle"], "name": "Gokarna Om Beach, Karnataka", "latitude": 14.5186, "longitude": 74.3168, "region_id": "karnataka"},
    {"aliases": ["malpe beach", "malpe"], "name": "Malpe Beach, Karnataka", "latitude": 13.3570, "longitude": 74.7020, "region_id": "karnataka"},
    {"aliases": ["mangalore", "mangaluru"], "name": "Mangalore Coastal Sector", "latitude": 12.9141, "longitude": 74.8560, "region_id": "karnataka"},

    # Andhra Pradesh
    {"aliases": ["rushikonda beach", "rushikonda", "rishikonda"], "name": "Rushikonda Blue Flag Beach, Visakhapatnam", "latitude": 17.7819, "longitude": 83.3837, "region_id": "andhra_pradesh"},
    {"aliases": ["ramakrishna beach", "rk beach"], "name": "Ramakrishna Beach, Visakhapatnam", "latitude": 17.7125, "longitude": 83.3228, "region_id": "andhra_pradesh"},
    {"aliases": ["visakhapatnam", "vizag"], "name": "Visakhapatnam Coastal Sector", "latitude": 17.7125, "longitude": 83.3228, "region_id": "andhra_pradesh"},

    # West Bengal
    {"aliases": ["digha beach", "digha"], "name": "Digha Sea Beach, West Bengal", "latitude": 21.6266, "longitude": 87.5074, "region_id": "west_bengal"},
    {"aliases": ["mandarmani"], "name": "Mandarmani Beach, West Bengal", "latitude": 21.6667, "longitude": 87.7000, "region_id": "west_bengal"},
    {"aliases": ["bakkhali"], "name": "Bakkhali Beach, West Bengal", "latitude": 21.5647, "longitude": 88.2572, "region_id": "west_bengal"},

    # Islands
    {"aliases": ["radhanagar beach", "radhanagar", "havelock"], "name": "Radhanagar Beach, Havelock Island", "latitude": 11.9840, "longitude": 92.9510, "region_id": "islands"},
    {"aliases": ["port blair"], "name": "Port Blair Coastal Sector", "latitude": 11.6234, "longitude": 92.7265, "region_id": "islands"},
]


def resolve_coastal_destination(query: str, fallback_location: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Scans user query for explicitly mentioned coastal destinations or beaches.
    If matched, returns exact destination coordinates and regional attribution.
    Otherwise preserves fallback_location or defaults to Gopalpur Sector.
    """
    if not query:
        return fallback_location or {"name": "Gopalpur Sector", "latitude": 19.31, "longitude": 84.91}

    q = query.lower()
    # Check aliases in order of descending alias length so specific phrases match before single words
    sorted_destinations = []
    for d in COASTAL_DESTINATIONS:
        for a in d["aliases"]:
            sorted_destinations.append((len(a), a, d))
    sorted_destinations.sort(key=lambda x: -x[0])

    for _, alias, dest in sorted_destinations:
        # Require word boundary or clear substring presence
        if alias in q:
            return {
                "name": dest["name"],
                "latitude": dest["latitude"],
                "longitude": dest["longitude"],
                "region_id": dest.get("region_id"),
            }

    if fallback_location and fallback_location.get("latitude"):
        return fallback_location

    return {"name": "Gopalpur Sector", "latitude": 19.31, "longitude": 84.91}


def detect_intent(query: str) -> str:
    """Detects query intent (suitability check, risk explanation, conditions summary, greeting, etc.)."""
    if is_greeting(query):
        return "greeting"
    q = query.lower()
    if any(k in q for k in ["why is", "why are", "explain why", "reason for unsuitable", "why unsuitable"]):
        return "risk_explanation"
    if any(k in q for k in ["is it a good time", "can i go", "is it safe", "suitability", "should i"]):
        return "suitability_check"
    if any(k in q for k in [
        "more suitable places", "places nearby", "recommend places", "where to",
        "visiting areas", "places to visit", "visiting places", "attractions near", "nearby places",
    ]):
        return "nearby_recommendations"
    return "conditions_advisory"


def plan_query(state: AgentState) -> Dict[str, Any]:
    """
    Planner Node:
    - Analyzes query, role, and activity.
    - Resolves coastal location entities directly from query text.
    - Determines required specialist agents per the routing table.
    - Updates intent and activity in graph state.
    """
    query = state.get("user_query", "")
    role = state.get("role", "general")
    current_activity = state.get("activity")

    activity = detect_activity_from_query(query, current_activity)
    intent = detect_intent(query)

    # Determine required tools/specialists based on routing table
    if intent == "greeting":
        required_tools = ["weather", "ocean"]
    elif intent == "risk_explanation":
        # Explaining an unsuitable condition relies on existing risk context
        required_tools = ["risk_context"]
    elif activity == "sightseeing" or "sightseeing" in query.lower() or "monument" in query.lower():
        # Sightseeing strictly skips ocean across all personas per architecture §2.2
        required_tools = ["weather", "gis"] if ("places" in query.lower() or "visiting" in query.lower()) else ["weather", "gis", "advisory"]
    elif intent == "nearby_recommendations":
        required_tools = ["weather", "ocean", "advisory", "gis"] if activity != "sightseeing" else ["weather", "gis", "advisory"]
    elif role == "tourist":
        act_key = activity or "beach_visit"
        required_tools = list(TOURIST_ROUTING.get(act_key, ["weather", "ocean", "advisory", "gis"]))
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

    # Location resolution: Check if user query mentions a specific coastal destination
    loc = resolve_coastal_destination(query, state.get("location"))

    return {
        "intent": intent,
        "activity": activity,
        "time_window": time_window,
        "location": loc,
        "selected_tools": required_tools,
    }
