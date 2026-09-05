import pytest
from app.graph.builder import get_compiled_graph
from app.graph.nodes.planner import detect_intent, detect_activity_from_query, is_greeting


def test_greeting_detection():
    """Verifies that greetings like 'hi', 'high', 'hello', 'namaste' are recognized."""
    for word in ['hi', 'high', 'hello', 'hey', 'namaste', 'good morning', 'who are you']:
        assert is_greeting(word) is True, f"Failed to identify {word} as a greeting"
        assert detect_intent(word) == "greeting"
        assert detect_activity_from_query(word) is None, f"Greeting {word} should not have an activity"


def test_marine_activity_preserved():
    """Verifies standard marine queries still properly resolve activities."""
    assert detect_activity_from_query("Can I go swimming at Puri beach?") in ["water_recreation", "beach_visit"]
    assert detect_activity_from_query("Is it safe for boating?") == "boating"
    assert detect_activity_from_query("I want to go sightseeing around the temple") == "sightseeing"


@pytest.mark.asyncio
async def test_greeting_graph_execution_has_no_beach_suitability():
    """
    CRITICAL USER REQUIREMENT:
    When a user says 'high' or 'hi', the deterministic core and graph MUST NOT
    emit an inappropriate beach suitability card (e.g. 80/100 Beach Visit).
    """
    graph = get_compiled_graph()
    state = {
        "user_id": "test-user",
        "role": "tourist",
        "language": "en",
        "activity": None,
        "user_query": "high",
        "location": {"name": "Goa Coastal Sector", "latitude": 15.45, "longitude": 73.80},
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
        "selected_model": "deterministic",
        "model_used": "deterministic",
    }

    result = await graph.ainvoke(state)

    assert result["intent"] == "greeting"
    assert result["activity"] is None
    assert result["activity_suitability"] is None
    assert result["risk_result"] is None
    assert "Goa Coastal Sector" in result["final_response"]
    assert "suitability score" not in result["final_response"].lower()
