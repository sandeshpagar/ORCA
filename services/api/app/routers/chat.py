import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
import logging

from app.auth.deps import get_current_user, AuthenticatedUser
from app.db.session import get_db
from app.db.models import UserRoleEnum, TouristPreference, Conversation, Message
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    DataSourceInfo,
    MarineMetrics,
    ConversationSummary,
    ConversationDetail,
    CreateConversationRequest,
    UpdateConversationRequest,
)
from app.graph.builder import get_compiled_graph

logger = logging.getLogger(__name__)

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
        "language": payload.language or current_user.language or "en",
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

    # Persist Conversation and Messages to DB with graceful fallback
    try:
        conv_stmt = select(Conversation).where(Conversation.id == conv_id)
        conv_res = await db.execute(conv_stmt)
        conv = conv_res.scalar_one_or_none()
        if not conv:
            first_line = payload.query.strip().split("\n")[0]
            title = (first_line[:40] + "...") if len(first_line) > 40 else first_line
            conv = Conversation(
                id=conv_id,
                user_id=current_user.user_id if current_user else None,
                title=title or "Marine Advisory",
            )
            db.add(conv)
            await db.flush()

        # Add user message
        user_msg = Message(
            conversation_id=conv_id,
            role="user",
            content=payload.query,
            metadata_json={
                "region_name": loc_name,
                "latitude": lat,
                "longitude": lon,
                "selected_model": payload.selected_model or "auto",
            },
        )
        db.add(user_msg)

        # Add assistant message
        asst_msg = Message(
            conversation_id=conv_id,
            role="assistant",
            content=reply,
            metadata_json={
                "metrics": metrics.model_dump() if metrics else None,
                "data_source": primary_source.model_dump() if primary_source else None,
                "safety_verdict": verdict,
                "active_nodes": active_nodes,
                "activity_suitability": suitability,
                "risk_result": risk,
                "sources": sources,
                "model_used": model_used,
                "is_live": weather_dict.get("is_live", True) if weather_dict else False,
            },
        )
        db.add(asst_msg)
        await db.commit()
    except Exception as persist_err:
        logger.warning(f"Could not persist chat message to database: {persist_err}")
        try:
            await db.rollback()
        except Exception:
            pass

    resolved_loc = graph_res.get("location") or {"name": loc_name, "latitude": lat, "longitude": lon}

    return ChatResponse(
        reply=reply,
        data_source=primary_source,
        metrics=metrics,
        safety_verdict=verdict,
        user_role=current_user.role.value,
        location=resolved_loc,
        is_live=weather_dict.get("is_live", True),
        conversation_id=conv_id,
        created_at=now_iso,
        active_nodes=active_nodes,
        activity_suitability=suitability,
        risk_result=risk,
        sources=sources,
        model_used=model_used,
    )


@router.get("/chat/conversations", response_model=list[ConversationSummary])
@router.get("/api/chat/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List conversation threads for the active session, sorted by recent activity."""
    try:
        stmt = (
            select(Conversation)
            .where(
                (Conversation.user_id == current_user.user_id)
                | (Conversation.user_id.is_(None))
            )
            .order_by(desc(Conversation.created_at))
            .limit(50)
        )
        res = await db.execute(stmt)
        conversations = res.scalars().all()

        summaries = []
        for c in conversations:
            msg_stmt = (
                select(Message)
                .where(Message.conversation_id == c.id)
                .order_by(desc(Message.created_at))
                .limit(1)
            )
            msg_res = await db.execute(msg_stmt)
            last_msg = msg_res.scalar_one_or_none()

            count_stmt = select(func.count(Message.id)).where(Message.conversation_id == c.id)
            count_res = await db.execute(count_stmt)
            count = count_res.scalar() or 0

            summaries.append(
                ConversationSummary(
                    id=c.id,
                    title=c.title or "Marine Advisory Session",
                    created_at=c.created_at.isoformat() if c.created_at else datetime.now(timezone.utc).isoformat(),
                    message_count=count,
                    last_message=last_msg.content[:80] if last_msg else None,
                )
            )
        return summaries
    except Exception as e:
        logger.warning(f"Error listing conversations: {e}")
        return []


@router.get("/chat/conversations/{conversation_id}", response_model=ConversationDetail)
@router.get("/api/chat/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full message history for a specific conversation session."""
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    res = await db.execute(conv_stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msg_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(msg_stmt)
    messages = msg_res.scalars().all()

    formatted_messages = []
    for m in messages:
        formatted_messages.append({
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else datetime.now(timezone.utc).isoformat(),
            "metadata": m.metadata_json or {},
        })

    return ConversationDetail(
        id=conv.id,
        title=conv.title or "Marine Advisory Session",
        created_at=conv.created_at.isoformat() if conv.created_at else datetime.now(timezone.utc).isoformat(),
        messages=formatted_messages,
    )


@router.post("/chat/conversations", response_model=ConversationSummary)
@router.post("/api/chat/conversations", response_model=ConversationSummary)
async def create_conversation(
    payload: CreateConversationRequest = CreateConversationRequest(),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversation session explicitly."""
    new_id = str(uuid.uuid4())
    conv = Conversation(
        id=new_id,
        user_id=current_user.user_id if current_user else None,
        title=payload.title or "New Chat",
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat() if conv.created_at else datetime.now(timezone.utc).isoformat(),
        message_count=0,
        last_message=None,
    )


@router.patch("/chat/conversations/{conversation_id}", response_model=ConversationSummary)
@router.patch("/api/chat/conversations/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: str,
    payload: UpdateConversationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rename a conversation title."""
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    res = await db.execute(conv_stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = payload.title.strip()
    await db.commit()
    await db.refresh(conv)

    count_stmt = select(func.count(Message.id)).where(Message.conversation_id == conv.id)
    count_res = await db.execute(count_stmt)
    count = count_res.scalar() or 0

    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at.isoformat() if conv.created_at else datetime.now(timezone.utc).isoformat(),
        message_count=count,
        last_message=None,
    )


@router.delete("/chat/conversations/{conversation_id}")
@router.delete("/api/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation session and cascade-delete its messages."""
    conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
    res = await db.execute(conv_stmt)
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"status": "deleted", "id": conversation_id}
