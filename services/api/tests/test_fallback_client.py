import pytest
from unittest.mock import patch, AsyncMock
import httpx

from app.config import settings
from app.llm.fallback_client import FallbackLLMClient, generate_synthesis


@pytest.mark.asyncio
async def test_deterministic_selection_bypasses_network():
    """Verify selecting deterministic engine performs 0 network calls and returns deterministic tag."""
    client = FallbackLLMClient()
    with patch("httpx.AsyncClient.post") as mock_post:
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m. Rating: HIGH.",
            user_query="Can I visit the beach?",
            role="tourist",
            selected_model="deterministic",
        )
        assert synthesized is None
        assert model_used == "deterministic"
        mock_post.assert_not_called()


@pytest.mark.asyncio
async def test_openrouter_synthesis_success():
    """Verify successful OpenRouter call formats and returns model tag."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-mock-test-key"

    mock_response = httpx.Response(
        status_code=200,
        json={
            "choices": [
                {
                    "message": {
                        "content": "### 🏖️ Puri Beach is in optimal condition for your morning visit!"
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.0m. Status: SAFE.",
            user_query="Is it safe to swim?",
            role="tourist",
            selected_model="openrouter/llama-3.3-70b",
        )

        assert synthesized is not None
        assert "Puri Beach is in optimal condition" in synthesized
        assert model_used == "openrouter/llama-3.3-70b"


@pytest.mark.asyncio
async def test_openrouter_rate_limit_cascade():
    """Verify HTTP 429 on primary model seamlessly cascades to secondary free model."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-mock-test-key"

    res_429 = httpx.Response(
        status_code=429,
        text="Rate limit exceeded on free tier",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )
    res_200 = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": "Cascade response from Gemini Flash Free."}}]},
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=[res_429, res_200]):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.0m. Status: SAFE.",
            user_query="Is it safe?",
            role="tourist",
            selected_model="openrouter/llama-3.3-70b",
        )

        assert synthesized == "Cascade response from Gemini Flash Free."
        assert "openrouter/" in model_used


@pytest.mark.asyncio
async def test_ollama_local_synthesis():
    """Verify explicit selection of local Ollama directly invokes localhost:11434."""
    client = FallbackLLMClient()

    mock_ollama_res = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": "Local Ollama Llama 3.2 generated advisory."}}]},
        request=httpx.Request("POST", "http://localhost:11434/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_ollama_res):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.0m.",
            user_query="Status off Gopalpur?",
            role="fisher",
            selected_model="ollama/local",
        )

        assert synthesized == "Local Ollama Llama 3.2 generated advisory."
        assert model_used == "ollama/llama3.2"


@pytest.mark.asyncio
async def test_graceful_deterministic_fallback_when_all_fail():
    """DATA HONESTY & SAFETY GUARANTEE: If all APIs are down, return None without exceptions."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-mock-key"

    with patch(
        "httpx.AsyncClient.post",
        new_callable=AsyncMock,
        side_effect=httpx.ConnectError("Network unreachable"),
    ):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.0m.",
            user_query="Test query",
            role="tourist",
            selected_model="auto",
        )

        # Must cleanly return deterministic fallback
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_ollama_multilingual_indic_synthesis():
    """Verify Hindi and Marathi requests configure the tuned 700-token budget and stop sequences."""
    client = FallbackLLMClient()

    mock_ollama_res = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": "• **सुरक्षित** (SAFE): यंत्रीकृत नौकाओं के लिए परिचालन अनुकूल है।"}}]},
        request=httpx.Request("POST", "http://127.0.0.1:11434/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_ollama_res) as mock_post:
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="• लहरों की ऊंचाई: 1.0m",
            user_query="क्या आज रात नौकाएं जा सकती हैं?",
            role="fisher",
            selected_model="ollama/local",
            language="hi",
        )

        assert synthesized is not None
        assert "यंत्रीकृत नौकाओं" in synthesized
        assert model_used == "ollama/llama3.2"

        # Verify payload contains 700 max_tokens and stop tokens for Devanagari completion
        call_kwargs = mock_post.call_args[1]
        sent_payload = call_kwargs.get("json", {})
        assert sent_payload.get("max_tokens") == 700
        assert "stop" in sent_payload
        assert "### 🌊" in sent_payload["stop"]


@pytest.mark.asyncio
async def test_ollama_qwen_model_selection():
    """Verify selecting ollama/qwen2.5:7b routes cleanly to qwen2.5:7b."""
    client = FallbackLLMClient()

    mock_ollama_res = httpx.Response(
        status_code=200,
        json={"choices": [{"message": {"content": "Qwen 2.5 7B generated advisory."}}]},
        request=httpx.Request("POST", "http://127.0.0.1:11434/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_ollama_res) as mock_post:
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.0m.",
            user_query="Status?",
            role="tourist",
            selected_model="ollama/qwen2.5:7b",
            language="en",
        )

        assert synthesized == "Qwen 2.5 7B generated advisory."
        assert model_used == "ollama/qwen2.5:7b"
        call_kwargs = mock_post.call_args[1]
        sent_payload = call_kwargs.get("json", {})
        assert sent_payload.get("model") == "qwen2.5:7b"


def test_sanitize_llm_response_removes_table_of_contents():
    """Verify that hallucinated Table of Contents blocks and anchor links are cleanly stripped."""
    raw_llm_output = (
        "Based on the provided data, mechanised trawlers can venture 15 nautical miles off Puri Golden Beach tonight.\n\n"
        "**GitHub Markdown Table of Contents**\n\n"
        "* [Mechanised Trawler Advisory for Puri Golden Beach](#mechanised-trawler-advisory-for-puri-golden-beach)\n"
        "* [Summary](#summary)"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert "Table of Contents" not in cleaned
    assert "#mechanised-trawler" not in cleaned
    assert "#summary" not in cleaned
    assert "Based on the provided data, mechanised trawlers can venture 15 nautical miles off Puri Golden Beach tonight." in cleaned


def test_sanitize_llm_response_removes_standalone_anchor_links():
    """Verify that dangling markdown anchor link bullets without headers are also stripped."""
    raw_llm_output = (
        "• **Operational Verdict**: **SAFE** (Mechanised craft)\n"
        "• **Wave Height**: 1.2m | **Wind**: 14 km/h\n\n"
        "* [Advisory Details](#advisory-details)\n"
        "* [Telemetry Sources](#telemetry-sources)"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert "[Advisory Details]" not in cleaned
    assert "[Telemetry Sources]" not in cleaned
    assert "• **Operational Verdict**: **SAFE** (Mechanised craft)" in cleaned
    assert "• **Wave Height**: 1.2m | **Wind**: 14 km/h" in cleaned


def test_sanitize_llm_response_truncates_dangling_sentence():
    """Verify that an incomplete sentence halted mid-way due to token limit is truncated back to last punctuation."""
    raw_llm_output = (
        "• **Operational Verdict**: **CAUTION**\n"
        "• **Wave Height**: 2.8m\n\n"
        "Mechanised trawlers should operate with caution due to evening squall surge. For more information or to"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert cleaned.endswith("evening squall surge.")
    assert "For more information or to" not in cleaned


def test_sanitize_llm_response_strips_dangling_outro_headers():
    """Verify trailing headers like 'For more information:' or 'Further Details:' are pruned."""
    raw_llm_output = (
        "• **Operational Verdict**: **SAFE**\n"
        "• **Conditions**: Optimal.\n\n"
        "**For more information:**"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert cleaned.endswith("Optimal.")
    assert "For more information" not in cleaned


def test_sanitize_llm_response_removes_nemotron_thinking_scratchpad():
    """Verify Nemotron 'Here's a thinking process:' scratchpad is stripped while preserving the advisory."""
    raw_llm_output = (
        "Here's a thinking process:\n"
        "1. Analyze User Query and Inputs:\n"
        "- Query: Can I go fishing today?\n"
        "- Role: Fisherman\n\n"
        "2. Evaluate Oceanographic Conditions:\n"
        "- Wave height: 1.5m\n\n"
        "---\n\n"
        "• **Operational Status**: **SAFE** for mechanised trawlers.\n"
        "• **Wave Height**: 1.5m | **Wind**: 18 km/h"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert "Here's a thinking process" not in cleaned
    assert "Analyze User Query" not in cleaned
    assert "Evaluate Oceanographic Conditions" not in cleaned
    assert "• **Operational Status**: **SAFE** for mechanised trawlers." in cleaned
    assert "• **Wave Height**: 1.5m | **Wind**: 18 km/h" in cleaned


def test_sanitize_llm_response_removes_xml_thinking_tags():
    """Verify DeepSeek / Qwen <think> ... </think> reasoning blocks are cleanly stripped."""
    raw_llm_output = (
        "<think>\n"
        "The user is a fisherman asking about coastal safety.\n"
        "Wave conditions are 2.5m, wind 25km/h. This warrants CAUTION.\n"
        "</think>\n"
        "• **सागरी सल्ला**: सावधगिरी बाळगा (CAUTION).\n"
        "• **लाटांची उंची**: 2.5m"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert "<think>" not in cleaned
    assert "</think>" not in cleaned
    assert "The user is a fisherman" not in cleaned
    assert "• **सागरी सल्ला**: सावधगिरी बाळगा (CAUTION)." in cleaned


def test_sanitize_llm_response_discards_pure_thinking_scratchpad():
    """Verify that if model only generates scratchpad and runs out of tokens, it returns empty string."""
    raw_llm_output = (
        "Here's a thinking process that leads to the suggested advisory:\n"
        "1. Analyze User Query and Inputs: Role is fisher, region is Puri.\n"
        "2. Evaluate Oceanographic Conditions: Wind is high, wave is moderate.\n"
        "3. Formulate bullets:"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert cleaned == ""


def test_sanitize_llm_response_removes_dangling_indic_conjunction():
    """Verify dangling Marathi/Indic conjunctions like 'आणि' halted mid-sentence are pruned."""
    raw_llm_output = (
        "• **सागरी सल्ला**: सावधगिरी बाळगा (CAUTION).\n"
        "• **लाटांची उंची**: 2.5m\n"
        "• **सुरक्षा सल्ला**: समुद्रात जाताना सर्व सुरक्षा उपकरणांची तपासणी करा आणि"
    )
    cleaned = FallbackLLMClient._sanitize_llm_response(raw_llm_output)
    assert "तपासणी करा आणि" not in cleaned
    assert cleaned.endswith("• **लाटांची उंची**: 2.5m")


@pytest.mark.asyncio
async def test_ollama_connection_failure_latches_offline_for_300s():
    """Verify that when Ollama connection is refused, it latches offline for 300 seconds."""
    import time
    client = FallbackLLMClient()
    client._ollama_offline_until = 0.0

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        res = await client._call_ollama([{"role": "user", "content": "hi"}], force_check=False)
        assert res is None
        # Must be latched for 300s (at least 280s remaining)
        assert client._ollama_offline_until > time.time() + 280.0


@pytest.mark.asyncio
async def test_extracts_reasoning_when_content_is_none():
    """Verify that models putting text in choice.message.reasoning are handled properly."""
    client = FallbackLLMClient()
    mock_response = httpx.Response(
        status_code=200,
        json={
            "choices": [
                {
                    "message": {
                        "content": None,
                        "reasoning": "• **Maritime Advisory**: Sea conditions are optimal. Wave height: 1.0m."
                    }
                }
            ]
        },
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response):
        res = await client._call_openai_compatible_api(
            base_url="https://openrouter.ai/api/v1",
            model_name="liquid/lfm-2.5-2.6b:free",
            messages=[{"role": "user", "content": "hi"}],
            api_key="sk-test",
        )
        assert res is not None
        assert "Sea conditions are optimal" in res


