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
