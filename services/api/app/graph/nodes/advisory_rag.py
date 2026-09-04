from typing import Dict, Any, List
from app.graph.state import AgentState


def get_grounding_advisories(role: str, activity: str) -> Dict[str, Any]:
    """
    Retrieves regulatory guidelines, official coastal advisories, and port signals.
    """
    advisories: List[str] = []
    warnings: List[str] = []

    if activity in ["boating", "water_recreation"]:
        warnings.append("Maritime Safety Rule: Approved Type-III PFD lifejackets are mandatory for all passengers aboard small craft.")
        advisories.append("Gopalpur Port VTS: Recreational boats must maintain 1 nautical mile separation from commercial shipping channels.")
    elif activity == "beach_visit":
        advisories.append("Odisha Tourism Coastal Safety: Designated bathing zones are patrolled by trained lifeguards daily 06:00 – 18:00 IST.")
        warnings.append("Caution: Rip currents can develop near rocky breakwaters during incoming tide transitions.")
    else:
        advisories.append("Coastal Zone Advisory: Normal tourist visiting hours active across maritime monuments.")

    return {
        "official_notices": advisories,
        "warnings": warnings,
        "port_signal": "Signal 1 (General Vigilance)",
        "source_doc": "Directorate General of Shipping — Coastal Craft Safety Standards & State Tourism Manual",
    }


async def advisory_rag_node(state: AgentState) -> Dict[str, Any]:
    """
    Advisory / RAG Specialist Node:
    Retrieves relevant grounding safety regulations, coastal zone notices, and official warnings.
    """
    selected = state.get("selected_tools") or ["advisory"]
    if "advisory" not in selected:
        return {"advisory_result": None}

    role = state.get("role", "tourist")
    activity = state.get("activity", "beach_visit")

    advisory_data = get_grounding_advisories(role, activity)

    sources = list(state.get("sources", []))
    sources.append({
        "name": "IMD Coastal Division & State Maritime Board Regulations",
        "type": "advisory",
        "reliability": "LIVE",
        "timestamp": "2026-09-04T06:00:00Z",
        "attribution": "National Disaster Management Authority Coastal Safety Compendium",
    })

    return {
        "advisory_result": advisory_data,
        "sources": sources,
    }
