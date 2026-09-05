import pytest
from app.graph.builder import get_compiled_graph
from app.graph.state import AgentState


GOLDEN_QUERIES = [
    {
        "query": "Is it a good time to visit the beach tomorrow morning?",
        "role": "tourist",
        "activity": "beach_visit",
        "expected_tools": ["weather", "ocean", "advisory", "gis"],
    },
    {
        "query": "Can I go boating this weekend?",
        "role": "tourist",
        "activity": "boating",
        "expected_tools": ["weather", "ocean", "advisory", "gis"],
    },
    {
        "query": "Show me more suitable places for sightseeing nearby.",
        "role": "tourist",
        "activity": "sightseeing",
        "expected_tools": ["weather", "gis"],
    },
    {
        "query": "Why is boating unsuitable?",
        "role": "tourist",
        "activity": "boating",
        "expected_tools": ["risk_context"],
    },
]


def make_initial_state(query_item: dict) -> AgentState:
    return {
        "user_id": "golden-eval-user",
        "role": query_item["role"],
        "language": "en",
        "activity": query_item["activity"],
        "user_query": query_item["query"],
        "location": {"name": "Gopalpur Sector", "latitude": 19.31, "longitude": 84.91},
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
    }


@pytest.mark.asyncio
async def test_golden_queries_expected_tools():
    """
    Evaluates the 4 golden queries against their required tool sets
    mandated by docs/04_Design_Document.md §4.3.
    """
    graph = get_compiled_graph()

    for item in GOLDEN_QUERIES:
        state = make_initial_state(item)
        result = await graph.ainvoke(state)

        selected = result.get("selected_tools", [])
        expected = item["expected_tools"]

        # Check expected tools were invoked
        for tool in expected:
            assert tool in selected, f"Query '{item['query']}' expected tool '{tool}', but got {selected}"

        # In particular, sightseeing MUST skip ocean
        if item["activity"] == "sightseeing":
            assert "ocean" not in selected, "Sightseeing must skip the Ocean specialist"
            assert result.get("ocean_result") is None, "Ocean result should be None for sightseeing"

        # Check that state has all 17 keys
        for key in [
            "user_id", "role", "language", "activity", "user_query", "location",
            "time_window", "intent", "weather_result", "ocean_result", "gis_result",
            "advisory_result", "risk_result", "activity_suitability", "sources",
            "errors", "final_response"
        ]:
            assert key in result, f"Missing required state key: {key}"


@pytest.mark.asyncio
async def test_score_reproducibility():
    """
    REPRODUCIBILITY MANDATE:
    Running the exact same query twice must produce the exact same suitability score.
    """
    graph = get_compiled_graph()
    item = GOLDEN_QUERIES[0]  # Beach visit query

    state1 = make_initial_state(item)
    state2 = make_initial_state(item)

    res1 = await graph.ainvoke(state1)
    res2 = await graph.ainvoke(state2)

    score1 = res1.get("activity_suitability", {}).get("score")
    score2 = res2.get("activity_suitability", {}).get("score")
    suitability1 = res1.get("activity_suitability", {}).get("suitability")
    suitability2 = res2.get("activity_suitability", {}).get("suitability")

    assert score1 is not None and score2 is not None
    assert score1 == score2, f"Suitability scores differ between runs: {score1} vs {score2}"
    assert suitability1 == suitability2


@pytest.mark.asyncio
async def test_no_absolutely_safe_label():
    """
    MANDATE: Never label anything 'absolutely safe' anywhere in output copy.
    """
    graph = get_compiled_graph()
    for item in GOLDEN_QUERIES:
        state = make_initial_state(item)
        res = await graph.ainvoke(state)
        response_text = res.get("final_response", "").lower()
        assert "absolutely safe" not in response_text, "Output must never claim 'absolutely safe'"
