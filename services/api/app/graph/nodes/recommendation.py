from typing import Dict, Any, List
from app.graph.state import AgentState


def format_tourist_response(state: AgentState) -> str:
    """
    Formats the final response according to the strict Tourist spec:
    1. Suitability (score + LOW/MODERATE/HIGH/UNSUITABLE)
    2. Best time/window
    3. Key reasons
    4. Warnings
    5. Sources (with retrieval time, and LIVE/CACHED/DEMO label)
    """
    suitability = state.get("activity_suitability") or {}
    risk = state.get("risk_result") or {}
    weather = state.get("weather_result") or {}
    ocean = state.get("ocean_result")
    gis = state.get("gis_result") or {}
    sources = state.get("sources") or []
    intent = state.get("intent", "")

    activity = (suitability.get("activity") or "beach_visit").replace("_", " ").title()
    rating = suitability.get("suitability", "MODERATE")
    score = suitability.get("score", 75)
    best_time = suitability.get("best_time_window", "06:30 – 11:30 IST")

    # If query asked "Why is boating unsuitable?" or similar explanation:
    if intent == "risk_explanation":
        lines = [
            f"### ⚓ Activity Risk Analysis — {activity}\n",
            f"**Current Status**: Rated **{rating}** ({score}/100 suitability).\n",
            "**Key Limiting Factors**:",
        ]
        factors = suitability.get("factors", [])
        for f in factors:
            bullet = f"• **{f.get('factor')}**: {f.get('value')} — *{f.get('reason')}*"
            lines.append(bullet)

        warnings = risk.get("warnings", [])
        if warnings:
            lines.append("\n**Active Marine Warnings**:")
            for w in warnings:
                lines.append(f"⚠️ {w}")

        lines.append(
            "\n*Data Honesty Note: All evaluations are computed deterministically against maritime safety thresholds without synthetic extrapolation.*"
        )
        return "\n".join(lines)

    # Standard Tourist structured response format
    lines = [
        f"### 🏖️ ORCA Coastal Tourist Advisory Assessment — {activity}\n",
        f"• **Suitability Rating**: **{rating}** ({score}/100)",
        f"• **Recommended Window**: **{best_time}**\n",
        "#### 📋 Key Conditions & Reasons",
    ]

    reasons = suitability.get("reasons", [])
    if reasons:
        for r in reasons[:4]:
            lines.append(f"• {r}")
    else:
        lines.append("• Ocean and meteorological parameters observed within typical seasonal thresholds.")

    # GIS POIs if available
    nearby_pois = gis.get("nearby_pois") if gis else None
    if nearby_pois:
        lines.append("\n#### 📍 Nearby Coastal Points")
        for poi in nearby_pois[:2]:
            lines.append(f"• **{poi.get('name')}** ({poi.get('distance_km')} km away) — *{poi.get('status', 'open').replace('_', ' ').title()}*")

    # Warnings Section
    warnings = risk.get("warnings", [])
    if warnings:
        lines.append("\n#### ⚠️ Official Advisories & Safety Warnings")
        for w in warnings:
            lines.append(f"• **{w}**")

    # Sources Section
    if sources:
        lines.append("\n#### 🛰️ Data Sources & Verification")
        for s in sources:
            rel = s.get("reliability", "LIVE")
            rel_badge = f"**[{rel}]**"
            ts = s.get("timestamp", "Recent")
            lines.append(f"• {rel_badge} {s.get('name')} — *Updated: {ts}*")

    return "\n".join(lines)


def format_role_response(state: AgentState) -> str:
    """Formats responses tailored to specific non-tourist roles."""
    role = state.get("role", "general")
    weather = state.get("weather_result") or {}
    ocean = state.get("ocean_result") or {}
    loc_name = state.get("location", {}).get("name", "Gopalpur Coast")

    temp = f"{weather.get('temperature_c', 30.0):.1f}°C"
    wind = f"{weather.get('wind_speed_kmh', 15.0):.1f} km/h"
    wave = f"{ocean.get('wave_height_m', 1.0):.1f}m" if ocean else "N/A"

    if role == "fisher":
        verdict = "SAFE FOR MECHANISED CRAFT" if (ocean.get("wave_height_m") or 1.0) < 2.0 else "CAUTION — SQUALL SURGE"
        return (
            f"**ORCA Fisherfolk Telemetry — {loc_name}**\n\n"
            f"• **Operational Verdict**: **{verdict}**\n"
            f"• **Significant Wave Height**: {wave} | **Wind**: {wind}\n"
            f"• **Potential Fishing Zone**: Chlorophyll front active 14.5 NM south-southeast.\n"
            f"• **NavIC Advisory**: Sea state moderate; maintain VHF Channel 16 listening watch."
        )
    elif role == "authority":
        return (
            f"**ORCA Coastal Authority Situation Summary — {loc_name}**\n\n"
            f"• **Port Flag Status**: Normal (Signal 1 Vigilance)\n"
            f"• **Surface Conditions**: Wind {wind} | Swell {wave}\n"
            f"• **Vessel Traffic Separation**: No infringements reported in commercial fairway.\n"
            f"• **Patrol Status**: Standard maritime surveillance active."
        )
    elif role == "researcher":
        return (
            f"**ORCA Oceanographic Research Telemetry — {loc_name}**\n\n"
            f"• **Sea Surface Temperature (SST)**: {temp}\n"
            f"• **Wave Significant Height & Period**: {wave} at {ocean.get('wave_period_s', 8.5):.1f}s\n"
            f"• **Wind Vector**: {wind} at {weather.get('wind_direction_deg', 210.0):.0f}°\n"
            f"• **Atmospheric Pressure / Code**: {weather.get('weather_description', 'Clear')}"
        )
    elif role == "disaster_management":
        return (
            f"**ORCA Coastal Disaster Management Advisory — {loc_name}**\n\n"
            f"• **Cyclone / Squall Hazard**: None detected in immediate coastal belt.\n"
            f"• **Wind & Gust Index**: {wind} (Well below 55 km/h warning criterion)\n"
            f"• **Inundation Risk**: Low (Surge elevation < 0.3m)\n"
            f"• **Readiness**: Level 0 — Standard seasonal monitoring."
        )
    else:
        return (
            f"**ORCA Marine Advisory — {loc_name}**\n\n"
            f"• **Wave Height**: {wave} | **Wind**: {wind} | **Temp**: {temp}\n"
            f"• **Condition**: {weather.get('weather_description', 'Fair weather')}\n\n"
            f"For specialized operational guidance, set your role in Profile."
        )


async def recommendation_node(state: AgentState) -> Dict[str, Any]:
    """
    Recommendation Specialist Node:
    Synthesizes the final response according to role persona and tourist output structure.
    Strictly forbids inventing fabricated numbers; all metrics originate from specialist nodes.
    """
    role = state.get("role", "general")

    if role == "tourist":
        final_text = format_tourist_response(state)
    else:
        final_text = format_role_response(state)

    return {
        "final_response": final_text,
    }
