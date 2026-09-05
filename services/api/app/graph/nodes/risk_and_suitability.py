from typing import Dict, Any, Optional
from app.graph.state import AgentState
from app.agents.suitability_risk_engine import evaluate_activity_suitability

# Backward-compatible alias for existing tests and router calls
calculate_deterministic_suitability = evaluate_activity_suitability


def risk_and_suitability_node(state: AgentState) -> Dict[str, Any]:
    """
    Deterministic Activity Suitability & Risk Assessment Node:
    Combines outputs from specialist nodes and computes mathematical safety scores.
    """
    activity = state.get("activity") or "beach_visit"
    weather = state.get("weather_result")
    ocean = state.get("ocean_result")
    gis = state.get("gis_result")
    advisory = state.get("advisory_result")
    intent = state.get("intent", "suitability_check")

    result = evaluate_activity_suitability(
        activity=activity,
        weather=weather,
        ocean=ocean,
        gis=gis,
        advisory=advisory,
        intent=intent,
    )

    activity_suitability = {
        "activity": activity,
        "suitability": result["suitability"],
        "score": result["score"],
        "factors": result["factors"],
        "reasons": result["reasons"],
        "best_time_window": result["best_time_window"],
        "summary": result["summary"],
    }

    risk_result = {
        "level": result["risk_level"],
        "score": 100 - result["score"],  # Risk is inverse of suitability
        "factors": result["factors"],
        "warnings": result["warnings"],
    }

    return {
        "activity_suitability": activity_suitability,
        "risk_result": risk_result,
    }
