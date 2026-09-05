from typing import TypedDict, Optional, Dict, Any, List


class AgentState(TypedDict):
    """
    Core state schema for ORCA LangGraph multi-agent system.
    Mandated by docs/03_System_Architecture.md §2.1.
    """
    user_id: str
    role: str
    language: str
    activity: Optional[str]
    user_query: str
    location: Dict[str, Any]
    time_window: Dict[str, Any]
    intent: str
    weather_result: Optional[Dict[str, Any]]
    ocean_result: Optional[Dict[str, Any]]
    gis_result: Optional[Dict[str, Any]]
    advisory_result: Optional[Dict[str, Any]]
    risk_result: Optional[Dict[str, Any]]
    activity_suitability: Optional[Dict[str, Any]]
    sources: List[Dict[str, Any]]
    errors: List[str]
    final_response: str
    selected_tools: Optional[List[str]]
    selected_model: Optional[str]
    model_used: Optional[str]

