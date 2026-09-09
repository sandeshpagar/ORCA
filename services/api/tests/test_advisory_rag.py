import pytest
from app.rag.knowledge_base import knowledge_engine, LocalKnowledgeEngine
from app.graph.nodes.advisory_rag import advisory_rag_node


def test_rag_retrieval_lifejackets():
    """Verify regulatory search for lifejackets returns DGS order."""
    results = knowledge_engine.search("What are the mandatory rules for lifejackets aboard small boats?", role="tourist")
    assert len(results) > 0
    top = results[0]
    assert "Directorate General of Shipping" in top["title"]
    assert "Personal Flotation Devices" in top["section"] or "lifejacket" in top["content"].lower()


def test_rag_retrieval_rip_current():
    """Verify safety search for rip currents returns Odisha Lifeguard protocol."""
    results = knowledge_engine.search("How do I escape a rip current if pulled out to sea?", role="tourist")
    assert len(results) > 0
    match = any("Rip Current" in r["section"] or "rip current" in r["content"].lower() for r in results)
    assert match


def test_rag_retrieval_monsoon_trawl_ban():
    """Verify fisher search for monsoon ban returns Ministry of Fisheries directive."""
    results = knowledge_engine.search("When does the East Coast monsoon trawl ban start?", role="fisher")
    assert len(results) > 0
    assert any("Monsoon Fishing Ban" in r["title"] or "Trawl Ban" in r["section"] for r in results)


def test_rag_retrieval_cyclone_signals():
    """Verify disaster management search for port signals returns IMD compendium."""
    results = knowledge_engine.search("What does Port Warning Signal No 3 mean?", role="authority")
    assert len(results) > 0
    assert any("Indian Meteorological Department" in r["title"] for r in results)


@pytest.mark.asyncio
async def test_advisory_rag_node_execution():
    """Verify advisory_rag_node outputs grounded citations with real document titles."""
    state = {
        "selected_tools": ["advisory"],
        "user_query": "Is lifejacket mandatory for small motorboat in Gopalpur?",
        "role": "tourist",
        "activity": "boating",
        "sources": [],
    }
    output = await advisory_rag_node(state)
    assert output["advisory_result"] is not None
    assert "source_doc" in output["advisory_result"]
    assert len(output["sources"]) > 0
    # Confirm source title is present
    assert any("Directorate General of Shipping" in s["name"] for s in output["sources"])
