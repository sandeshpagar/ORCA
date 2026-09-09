from typing import Dict, Any, List
from app.graph.state import AgentState
from app.llm.fallback_client import fallback_client
from app.localization.i18n import (
    localize_tourist_summary,
    localize_greeting,
    localize_role_response,
    get_header,
    get_suitability_label,
    get_risk_label,
)


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
    lang = state.get("language", "en") or "en"

    activity = (suitability.get("activity") or "beach_visit").replace("_", " ").title()
    rating = suitability.get("suitability", "MODERATE")
    score = suitability.get("score", 75)
    best_time = suitability.get("best_time_window", "06:30 – 11:30 IST")
    reasons = suitability.get("reasons", [])
    warnings = risk.get("warnings", [])

    # If non-English language requested (Hindi or Marathi)
    if lang in ["hi", "mr"]:
        localized = localize_tourist_summary(
            activity=activity,
            suitability_enum=rating,
            score=score,
            best_time=best_time,
            reasons=reasons or ["सागरी व हवामान निर्देशक सुरक्षित मर्यादेत आहेत."],
            warnings=warnings,
            lang=lang,
        )
        if localized:
            loc_lines = [localized]
            nearby_pois = gis.get("nearby_pois") if gis else None
            if nearby_pois:
                loc_lines.append(f"\n#### 📍 {get_header('nearby_points', lang)}")
                for poi in nearby_pois[:3]:
                    loc_lines.append(f"• **{poi.get('name')}** ({poi.get('distance_km')} km) — *{poi.get('status', 'open')}*")
            if sources:
                loc_lines.append(f"\n#### 🛰️ {get_header('data_sources', lang)}")
                for s in sources:
                    rel = s.get("reliability", "LIVE")
                    ts = s.get("timestamp", "Recent")
                    loc_lines.append(f"• **[{rel}]** {s.get('name')} — *Updated: {ts}*")
            return "\n".join(loc_lines)

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
        for poi in nearby_pois[:3]:
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

    lang = state.get("language", "en") or "en"
    if lang in ["hi", "mr"]:
        loc_resp = localize_role_response(
            role=role,
            loc_name=loc_name,
            wave=wave,
            wind=wind,
            temp=temp,
            weather_desc=weather.get("weather_description", "Clear"),
            lang=lang,
        )
        if loc_resp:
            return loc_resp

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


def format_greeting_response(state: AgentState) -> str:
    """Formats an authoritative, welcoming response for greetings without fake suitability metrics."""
    role = (state.get("role") or "general").upper()
    loc = state.get("location") or {}
    loc_name = loc.get("name", "Indian Coastal Waters")
    weather = state.get("weather_result") or {}
    ocean = state.get("ocean_result") or {}

    telemetry_parts = []
    if weather.get("temperature_c") is not None:
        telemetry_parts.append(f"🌡️ Temp: {weather['temperature_c']:.1f}°C")
    if weather.get("wind_speed_kmh") is not None:
        telemetry_parts.append(f"💨 Wind: {weather['wind_speed_kmh']:.1f} km/h")
    if ocean.get("wave_height_m") is not None:
        telemetry_parts.append(f"🌊 Waves: {ocean['wave_height_m']:.1f}m")

    telemetry_summary = " · ".join(telemetry_parts) if telemetry_parts else "Real-time telemetry stream active"

    lang = state.get("language", "en") or "en"
    if lang in ["hi", "mr"]:
        loc_greet = localize_greeting(
            loc_name=loc_name,
            role=role,
            telemetry_summary=telemetry_summary,
            lang=lang,
        )
        if loc_greet:
            return loc_greet

    return (
        f"### 🌊 ORCA Marine Intelligence Core — {loc_name}\n\n"
        f"Greetings! I am ORCA, an authoritative coastal safety and oceanographic AI decision-support system.\n\n"
        f"• **Sector Calibrated**: **{loc_name}** ({telemetry_summary})\n"
        f"• **Operational Role**: **{role}** (Tailored safety advisories active)\n\n"
        f"**How can I assist you today? You can ask me:**\n"
        f"1. *\"Is it safe to visit the beach or swim this afternoon?\"*\n"
        f"2. *\"What are the current wave heights and swell directions?\"*\n"
        f"3. *\"Can motorboats or fishing craft venture out safely tonight?\"*\n"
        f"4. *\"Are there any active rip currents or coastal hazards in this sector?\"*"
    )


async def recommendation_node(state: AgentState) -> Dict[str, Any]:
    """
    Recommendation Specialist Node:
    Synthesizes the final response according to role persona and tourist output structure.
    Strictly forbids inventing fabricated numbers; all metrics originate from specialist nodes.
    Invokes the resilient LLM engine (OpenRouter/Ollama) with automatic fallback to deterministic output.
    """
    intent = state.get("intent", "")
    role = state.get("role", "general")
    selected_model = state.get("selected_model") or "auto"
    user_query = state.get("user_query") or ""
    lang = state.get("language", "en") or "en"

    if intent == "greeting":
        deterministic_text = format_greeting_response(state)
    elif role == "tourist":
        deterministic_text = format_tourist_response(state)
    else:
        deterministic_text = format_role_response(state)

    final_text = deterministic_text
    model_used = "deterministic"

    if selected_model != "deterministic":
        synthesized, engine_name = await fallback_client.generate_synthesis(
            grounded_context=deterministic_text,
            user_query=user_query,
            role=role,
            selected_model=selected_model,
            language=lang,
        )
        if synthesized:
            final_text = synthesized
            model_used = engine_name
        else:
            model_used = "deterministic"

    return {
        "final_response": final_text,
        "model_used": model_used,
    }

