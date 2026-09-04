from langgraph.graph import StateGraph, START, END
from app.graph.state import AgentState
from app.graph.nodes.planner import plan_query
from app.graph.nodes.weather import weather_node
from app.graph.nodes.ocean import ocean_node
from app.graph.nodes.gis import gis_node
from app.graph.nodes.advisory_rag import advisory_rag_node
from app.graph.nodes.risk_and_suitability import risk_and_suitability_node
from app.graph.nodes.recommendation import recommendation_node


def build_orca_graph():
    """
    Constructs the LangGraph multi-agent pipeline for ORCA Marine AI:
    START -> planner -> weather -> ocean -> gis -> advisory_rag -> risk_and_suitability -> recommendation -> END
    """
    builder = StateGraph(AgentState)

    # 1. Register Nodes
    builder.add_node("planner", plan_query)
    builder.add_node("weather", weather_node)
    builder.add_node("ocean", ocean_node)
    builder.add_node("gis", gis_node)
    builder.add_node("advisory_rag", advisory_rag_node)
    builder.add_node("risk_and_suitability", risk_and_suitability_node)
    builder.add_node("recommendation", recommendation_node)

    # 2. Add Edges
    builder.add_edge(START, "planner")
    builder.add_edge("planner", "weather")
    builder.add_edge("weather", "ocean")
    builder.add_edge("ocean", "gis")
    builder.add_edge("gis", "advisory_rag")
    builder.add_edge("advisory_rag", "risk_and_suitability")
    builder.add_edge("risk_and_suitability", "recommendation")
    builder.add_edge("recommendation", END)

    return builder.compile()


# Singleton compiled graph
_orca_compiled_graph = None


def get_compiled_graph():
    global _orca_compiled_graph
    if _orca_compiled_graph is None:
        _orca_compiled_graph = build_orca_graph()
    return _orca_compiled_graph
