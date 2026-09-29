import pytest
import httpx
from unittest.mock import patch, AsyncMock
from app.llm.fallback_client import FallbackLLMClient, generate_synthesis


@pytest.mark.asyncio
async def test_cascade_openrouter_401_falls_back_cleanly():
    """Verify that an HTTP 401 (e.g. invalid key/user not found) does not crash and cascades."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-invalid-key"
    client._ollama_offline_until = 9999999999.0  # Force Ollama skipped

    res_401 = httpx.Response(
        status_code=401,
        json={"error": {"message": "User not found.", "code": 401}},
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=res_401):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Can I swim?",
            role="tourist",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_cascade_openrouter_429_iterates_then_falls_back():
    """Verify that continuous HTTP 429 across all models cascades down to deterministic."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-valid-key"
    client._ollama_offline_until = 9999999999.0  # Force Ollama skipped

    res_429 = httpx.Response(
        status_code=429,
        text="Rate limited upstream",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=res_429):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Is it safe?",
            role="tourist",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_cascade_openrouter_500_server_error_falls_back():
    """Verify that HTTP 500 / 503 internal server errors cascade without raising exceptions."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-valid-key"
    client._ollama_offline_until = 9999999999.0

    res_500 = httpx.Response(
        status_code=500,
        text="Internal Server Error at gateway",
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=res_500):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Current sea conditions?",
            role="fisher",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_cascade_timeout_falls_back():
    """Verify that network timeouts cascade cleanly to deterministic without hang or crash."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-valid-key"
    client._ollama_offline_until = 9999999999.0

    with patch("httpx.AsyncClient.post", side_effect=httpx.TimeoutException("Read timed out")):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Beach safety status?",
            role="tourist",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_cascade_malformed_json_falls_back_cleanly():
    """Verify that a malformed/non-JSON response body (e.g. Cloudflare HTML 502) is handled gracefully."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-valid-key"
    client._ollama_offline_until = 9999999999.0

    res_html = httpx.Response(
        status_code=200,  # Proxy returns 200 with raw HTML error
        text="<html><body>502 Bad Gateway</body></html>",
        headers={"Content-Type": "text/html"},
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=res_html):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Status?",
            role="tourist",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_cascade_empty_choices_falls_back():
    """Verify that valid 200 JSON with empty choices list falls back gracefully."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-valid-key"
    client._ollama_offline_until = 9999999999.0

    res_empty = httpx.Response(
        status_code=200,
        json={"choices": []},
        request=httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=res_empty):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Status?",
            role="tourist",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"


@pytest.mark.asyncio
async def test_cascade_connection_refused_all_tiers():
    """Verify that when both OpenRouter and Ollama have connection refused, it falls back to deterministic."""
    client = FallbackLLMClient()
    client.openrouter_api_key = "sk-or-v1-valid-key"
    client._ollama_offline_until = 0.0  # Allow Ollama attempt

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        synthesized, model_used = await client.generate_synthesis(
            grounded_context="Wave height: 1.2m.",
            user_query="Status?",
            role="tourist",
            selected_model="auto",
        )
        assert synthesized is None
        assert model_used == "deterministic"
        # Verify Ollama was latched offline
        assert client._ollama_offline_until > 0.0
