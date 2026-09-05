from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question or advisory prompt")
    latitude: Optional[float] = Field(default=None, description="Optional target latitude")
    longitude: Optional[float] = Field(default=None, description="Optional target longitude")
    conversation_id: Optional[str] = Field(default=None, description="Existing conversation ID")
    selected_model: Optional[str] = Field(default="auto", description="Selected AI model ID: 'auto', 'openrouter/llama-3.3-70b', 'openrouter/gemini-2.0-flash', 'openrouter/qwen-2.5-72b', 'ollama/local', or 'deterministic'")
    region_name: Optional[str] = Field(default=None, description="Target coastal region or sector name (e.g. 'Goa Coastal Sector')")


class DataSourceInfo(BaseModel):
    name: str = Field(..., description="Name of external data provider")
    type: str = Field(..., description="Data category: weather, ocean, gis, advisory")
    reliability: str = Field(..., description="Data honesty mode: LIVE, CACHED, or DEMO")
    timestamp: str = Field(..., description="ISO timestamp of observation or retrieval")
    attribution: str = Field(..., description="Formal citation/attribution string")


class MarineMetrics(BaseModel):
    temperature_c: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    wind_direction_deg: Optional[float] = None
    wave_height_m: Optional[float] = None
    wave_period_s: Optional[float] = None
    weather_description: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    data_source: DataSourceInfo
    metrics: Optional[MarineMetrics] = None
    safety_verdict: str = Field(..., description="Safety assessment: safe, caution, danger, or unknown")
    user_role: str
    location: Dict[str, Any]
    is_live: bool
    conversation_id: str
    created_at: str
    active_nodes: Optional[list[str]] = Field(default=None, description="Actual LangGraph specialist nodes that executed")
    activity_suitability: Optional[Dict[str, Any]] = Field(default=None, description="Deterministic activity suitability assessment")
    risk_result: Optional[Dict[str, Any]] = Field(default=None, description="Deterministic coastal risk scoring")
    sources: Optional[list[Dict[str, Any]]] = Field(default=None, description="Complete provenance list of all invoked sources")
    model_used: Optional[str] = Field(default="deterministic", description="Model engine that produced the final narrative")


