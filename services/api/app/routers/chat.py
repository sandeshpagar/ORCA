import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.auth.deps import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.db.models import UserRoleEnum, TouristPreference, Conversation, Message
from app.schemas.chat import ChatRequest, ChatResponse, DataSourceInfo, MarineMetrics
from app.graph.builder import get_compiled_graph

router = APIRouter(tags=["AI Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    payload: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Phase 2 LangGraph Multi-Agent Orchestration endpoint:
    - Derives user role strictly from server profile (never client payload).
    - Dispatches to LangGraph multi-agent pipeline:
        Planner -> Specialist Agents (Weather, Ocean, GIS, Advisory) ->
        Deterministic Activity Suitability & Risk -> Recommendation.
    - Honors activity-based routing: skips specialist nodes (e.g. Ocean for sightseeing).
    - Emits actual execution trace, suitability ratings, and verified data sources.
    - Zero fabricated marine measurements: strictly grounded.
    """
    lat = payload.latitude if payload.latitude is not None else (current_user.home_region_lat or 19.31)
    lon = payload.longitude if payload.longitude is not None else (current_user.home_region_lon or 84.91)
    loc_name = payload.region_name or current_user.home_region_name or f"Coordinates ({lat:.2f}°N, {lon:.2f}°E)"
    conv_id = payload.conversation_id or str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # If role is tourist, read user's preferred activity from DB
    user_activity = None
    if current_user.role == UserRoleEnum.TOURIST:
        stmt = select(TouristPreference).where(TouristPreference.user_id == current_user.user_id)
        result = await db.execute(stmt)
        pref = result.scalar_one_or_none()
        if pref and pref.activities:
            user_activity = pref.activities[0]

    # Initialize LangGraph AgentState
    initial_state = {
        "user_id": current_user.user_id,
        "role": current_user.role.value,
        "language": current_user.language or "en",
        "activity": user_activity,
        "user_query": payload.query,
        "location": {"name": loc_name, "latitude": lat, "longitude": lon},
        "time_window": {},
        "intent": "",
        "weather_result": None,
        "ocean_result": None,
        "gis_result": None,
        "advisory_result": None,
        "risk_result": None,
        "activity_suitability": None,
        "sources": [],
        "errors": [],
        "final_response": "",
        "selected_model": payload.selected_model or "auto",
        "model_used": "deterministic",
    }

    # Execute LangGraph Pipeline
    graph = get_compiled_graph()
    graph_res = await graph.ainvoke(initial_state)

    # Extract results
    reply = graph_res.get("final_response") or "ORCA advisory generated."
    model_used = graph_res.get("model_used") or "deterministic"
    suitability = graph_res.get("activity_suitability")
    risk = graph_res.get("risk_result")
    sources = graph_res.get("sources") or []
    selected_tools = graph_res.get("selected_tools") or []

    # Calculate actual active nodes that were executed
    active_nodes = ["planner"]
    for t in selected_tools:
        if t in ["weather", "ocean", "gis", "advisory"]:
            active_nodes.append(t)
    active_nodes.extend(["risk_and_suitability", "recommendation"])

    errors = graph_res.get("errors") or []
    weather = graph_res.get("weather_result")
    ocean = graph_res.get("ocean_result")

    # DATA HONESTY REQUIREMENT: If external APIs fail, do not fabricate numbers
    if errors and weather is None and ocean is None:
        primary_source = DataSourceInfo(
            name="Open-Meteo Marine & Weather API",
            type="weather",
            reliability="DEMO",
            timestamp=now_iso,
            attribution="External sensor stream unavailable; zero fabricated measurements policy active.",
        )
        limitation_reply = (
            f"**ORCA Marine Advisory Warning**\n\n"
            f"Live external oceanographic telemetry from Open-Meteo could not be retrieved for {loc_name}. "
            f"*(Error detail: {errors[0]})*\n\n"
            f"**Data Honesty Policy**: In accordance with the ORCA Safety Protocol (PRD §8), "
            f"we do not invent or synthesize current wave heights or wind speeds. "
            f"Please check your internet connection or verify local port signals directly."
        )
        return ChatResponse(
            reply=limitation_reply,
            data_source=primary_source,
            metrics=None,
            safety_verdict="unknown",
            user_role=current_user.role.value,
            location={"name": loc_name, "latitude": lat, "longitude": lon},
            is_live=False,
            conversation_id=conv_id,
            created_at=now_iso,
            active_nodes=active_nodes,
            activity_suitability=suitability,
            risk_result=risk,
            sources=sources,
            model_used="deterministic",
        )

    # Extract metrics from specialists
    weather_dict = weather or {}
    ocean_dict = ocean or {}

    metrics = MarineMetrics(
        temperature_c=weather_dict.get("temperature_c"),
        wind_speed_kmh=weather_dict.get("wind_speed_kmh"),
        wind_direction_deg=weather_dict.get("wind_direction_deg"),
        wave_height_m=ocean_dict.get("wave_height_m"),
        wave_period_s=ocean_dict.get("wave_period_s"),
        weather_description=weather_dict.get("weather_description"),
    )

    # Derive safety verdict
    risk_level = (risk.get("level") if risk else "low") or "low"
    if risk_level == "severe":
        verdict = "danger"
    elif risk_level in ["high", "moderate"]:
        verdict = "caution"
    else:
        verdict = "safe"

    # Primary data source
    primary_source = DataSourceInfo(
        name="Open-Meteo & LangGraph Multi-Agent Grid",
        type="multi_agent",
        reliability="LIVE" if weather_dict.get("is_live", True) else "DEMO",
        timestamp=now_iso,
        attribution="Open-Meteo, Survey of India NSDI, and IMD Coastal Advisories",
    )

    return ChatResponse(
        reply=reply,
        data_source=primary_source,
        metrics=metrics,
        safety_verdict=verdict,
        user_role=current_user.role.value,
        location={"name": loc_name, "latitude": lat, "longitude": lon},
        is_live=weather_dict.get("is_live", True),
        conversation_id=conv_id,
        created_at=now_iso,
        active_nodes=active_nodes,
        activity_suitability=suitability,
        risk_result=risk,
        sources=sources,
        model_used=model_used,
    )
