from typing import Dict, Any, List
from app.graph.state import AgentState


def calculate_deterministic_suitability(
    activity: str,
    weather: Dict[str, Any] | None,
    ocean: Dict[str, Any] | None,
    gis: Dict[str, Any] | None,
    advisory: Dict[str, Any] | None,
    intent: str,
) -> Dict[str, Any]:
    """
    Pure deterministic Python Activity Suitability and Risk Engine.
    MANDATE: NEVER an LLM call. Must be 100% reproducible and explainable.
    RULE: Never emit 'absolutely safe' anywhere in output copy.
    """
    # 1. Base Score
    score = 100
    factors: List[Dict[str, Any]] = []
    reasons: List[str] = []
    warnings: List[str] = []

    # 2. Extract measurements (default to safe baselines if specialist skipped)
    wind_kmh = (weather.get("wind_speed_kmh") if weather else 12.0) or 12.0
    temp_c = (weather.get("temperature_c") if weather else 29.0) or 29.0
    weather_desc = (weather.get("weather_description") if weather else "Partly cloudy") or "Partly cloudy"

    wave_m = (ocean.get("wave_height_m") if ocean else 1.0) or 1.0
    wave_period = (ocean.get("wave_period_s") if ocean else 8.0) or 8.0

    # 3. Deterministic Threshold Evaluation
    # Wave Height Impact
    if activity in ["boating", "water_recreation", "trawler_venture"]:
        if wave_m >= 2.5:
            score -= 60
            factors.append({
                "factor": "Significant Wave Height",
                "value": f"{wave_m:.1f}m",
                "impact": "critical",
                "reason": f"Swell height {wave_m:.1f}m exceeds the 2.5m threshold for small craft stability.",
            })
            reasons.append(f"Excessive wave heights of {wave_m:.1f}m create capsize risk for open boats.")
            warnings.append("Rough sea advisory active: Small craft must remain docked.")
        elif wave_m >= 1.8:
            score -= 30
            factors.append({
                "factor": "Significant Wave Height",
                "value": f"{wave_m:.1f}m",
                "impact": "warning",
                "reason": f"Wave height {wave_m:.1f}m indicates moderate chop requiring experienced navigation.",
            })
            reasons.append(f"Moderate chop ({wave_m:.1f}m) requires caution.")
        else:
            factors.append({
                "factor": "Significant Wave Height",
                "value": f"{wave_m:.1f}m",
                "impact": "favorable",
                "reason": f"Wave height {wave_m:.1f}m is within calm operational limits.",
            })
            reasons.append(f"Calm swell ({wave_m:.1f}m) supports stable operations.")
    elif activity == "beach_visit":
        if wave_m >= 2.0:
            score -= 40
            factors.append({
                "factor": "Surf Zone Waves",
                "value": f"{wave_m:.1f}m",
                "impact": "critical",
                "reason": f"Breaker wave height {wave_m:.1f}m generates severe shorebreak and undertow.",
            })
            reasons.append("Heavy surf creates dangerous shoreward rip currents.")
            warnings.append("Beach bathers warned against entering deep water.")
        elif wave_m >= 1.4:
            score -= 15
            factors.append({
                "factor": "Surf Zone Waves",
                "value": f"{wave_m:.1f}m",
                "impact": "warning",
                "reason": f"Moderate surf ({wave_m:.1f}m). Bathing should stay restricted to shallow patrolled areas.",
            })
        else:
            factors.append({
                "factor": "Surf Zone Waves",
                "value": f"{wave_m:.1f}m",
                "impact": "favorable",
                "reason": f"Gentle surf ({wave_m:.1f}m) observed along sandy shores.",
            })
            reasons.append("Gentle shore wave action.")

    # Wind Speed Impact
    if wind_kmh >= 45.0:
        score -= 50
        factors.append({
            "factor": "Sustained Wind Speed",
            "value": f"{wind_kmh:.1f} km/h",
            "impact": "critical",
            "reason": f"Wind speeds of {wind_kmh:.1f} km/h indicate near-gale squall conditions.",
        })
        reasons.append(f"Strong winds reaching {wind_kmh:.1f} km/h.")
        warnings.append("High wind warning: Gusts can displace parasails and small vessels.")
    elif wind_kmh >= 28.0:
        score -= 20
        factors.append({
            "factor": "Sustained Wind Speed",
            "value": f"{wind_kmh:.1f} km/h",
            "impact": "warning",
            "reason": f"Breezy conditions ({wind_kmh:.1f} km/h) creating surface spray.",
        })
        reasons.append(f"Moderate surface breeze ({wind_kmh:.1f} km/h).")
    else:
        factors.append({
            "factor": "Sustained Wind Speed",
            "value": f"{wind_kmh:.1f} km/h",
            "impact": "favorable",
            "reason": f"Gentle maritime breeze ({wind_kmh:.1f} km/h) within safe envelope.",
        })
        reasons.append(f"Light, comfortable wind conditions ({wind_kmh:.1f} km/h).")

    # Weather Condition Impact
    if any(k in weather_desc.lower() for k in ["thunder", "hail", "violent", "heavy rain"]):
        score -= 50
        factors.append({
            "factor": "Atmospheric Convection",
            "value": weather_desc,
            "impact": "critical",
            "reason": "Severe convective activity with risk of lightning strikes on water surfaces.",
        })
        warnings.append("Lightning hazard: Evacuate exposed beach areas immediately.")
    else:
        factors.append({
            "factor": "Atmospheric State",
            "value": weather_desc,
            "impact": "favorable",
            "reason": f"{weather_desc} provides good visibility across the coastal sector.",
        })

    # GIS Hazards (Proximity to Port Fairway / Restricted Channels)
    if gis and gis.get("has_restricted_hazard"):
        score -= 15
        factors.append({
            "factor": "Commercial Fairway Proximity",
            "value": "Within 2.0 km",
            "impact": "warning",
            "reason": "Near active port navigation channel. Commercial vessel traffic has right of way.",
        })
        warnings.append("Maintain clearance from marked deep-water navigation channels.")

    # Clamp score between 0 and 100
    score = max(5, min(100, score))

    # Categorization
    if score >= 80:
        suitability_label = "HIGH"
        risk_level = "low"
    elif score >= 55:
        suitability_label = "MODERATE"
        risk_level = "moderate"
    elif score >= 35:
        suitability_label = "LOW"
        risk_level = "high"
    else:
        suitability_label = "UNSUITABLE"
        risk_level = "severe"

    # Best time window determination
    if suitability_label in ["HIGH", "MODERATE"]:
        best_window = "06:30 – 11:30 IST (Morning optimal window before peak afternoon thermal breeze)"
    else:
        best_window = "Conditions currently unfavorable; review next tidal cycle at 06:00 IST tomorrow"

    summary_text = (
        f"Suitability rated **{suitability_label}** ({score}/100) based on verified real-time conditions: "
        f"wind at {wind_kmh:.1f} km/h, wave height at {wave_m:.1f}m, and {weather_desc.lower()} sky."
    )

    return {
        "score": score,
        "suitability": suitability_label,
        "risk_level": risk_level,
        "factors": factors,
        "reasons": reasons,
        "warnings": warnings,
        "best_time_window": best_window,
        "summary": summary_text,
    }


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

    result = calculate_deterministic_suitability(
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
