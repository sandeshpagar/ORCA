import pytest
from httpx import AsyncClient
from app.config import settings
from app.schemas.chat import ChatRequest
from pydantic import ValidationError


@pytest.mark.asyncio
async def test_liveness_health_probe_plain_no_external_deps(client: AsyncClient):
    """
    Task 3.7: /health must be a pure liveness check that never calls external services or DB,
    so it cannot fail if Supabase is briefly slow.
    """
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "version" in data
    # Must NOT expose internal connection strings or secrets
    assert "database" not in data
    assert "secret" not in str(data).lower()


@pytest.mark.asyncio
async def test_readiness_probe_ready_when_db_connected(client: AsyncClient):
    """
    Task 3.7: /ready must verify database connectivity and return 200 without exposing connection credentials.
    """
    res = await client.get("/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert data["database"] == "connected"
    assert "postgresql" not in str(data).lower()
    assert "password" not in str(data).lower()


@pytest.mark.asyncio
async def test_security_headers_present(client: AsyncClient):
    """
    Task 3.6: Verify standard HTTP security headers on responses.
    """
    res = await client.get("/health")
    assert res.status_code == 200
    headers = res.headers
    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert "strict-origin-when-cross-origin" in headers.get("referrer-policy", "")
    assert "default-src" in headers.get("content-security-policy", "")


def test_rate_limiter_unit_sliding_window():
    """
    Task 3.2: Unit test sliding window rate limiter logic.
    """
    from app.security.rate_limiter import SlidingWindowRateLimiter
    limiter = SlidingWindowRateLimiter(requests_limit=3, window_seconds=60)
    client_id = "test-client-123"

    # 3 allowed requests
    assert limiter.is_allowed(client_id)[0] is True
    assert limiter.is_allowed(client_id)[0] is True
    assert limiter.is_allowed(client_id)[0] is True

    # 4th request must be rejected with retry_after > 0
    allowed, retry_after, remaining = limiter.is_allowed(client_id)
    assert allowed is False
    assert retry_after > 0
    assert remaining == 0


@pytest.mark.asyncio
async def test_rate_limiter_blocks_burst_abuse_on_chat(client: AsyncClient, make_token):
    """
    Task 3.2: Verify rate limiting on /chat returns HTTP 429 with Retry-After.
    """
    from app.security.rate_limiter import chat_rate_limiter
    chat_rate_limiter.reset_for_test()

    token = make_token(user_id="burst-user")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"query": "Hello sea", "selected_model": "deterministic"}

    # Temporarily set limit to 2 for fast test execution
    original_limit = chat_rate_limiter.requests_limit
    chat_rate_limiter.requests_limit = 2
    try:
        # Request 1 & 2 succeed
        r1 = await client.post("/chat", headers=headers, json=payload)
        r2 = await client.post("/chat", headers=headers, json=payload)
        assert r1.status_code == 200
        assert r2.status_code == 200

        # Request 3 must hit HTTP 429 Too Many Requests
        r3 = await client.post("/chat", headers=headers, json=payload)
        assert r3.status_code == 429
        assert "Retry-After" in r3.headers
        assert int(r3.headers["Retry-After"]) >= 1
        assert "Too many advisory requests" in r3.json()["detail"]
    finally:
        chat_rate_limiter.requests_limit = original_limit
        chat_rate_limiter.reset_for_test()


def test_input_validation_caps_message_length():
    """
    Task 3.3: ChatRequest query capped to 1000 characters.
    """
    # Overly long prompt (1500 chars)
    long_query = "A" * 1500
    with pytest.raises(ValidationError) as exc_info:
        ChatRequest(query=long_query)
    assert "query" in str(exc_info.value)


def test_input_validation_language_whitelist():
    """
    Task 3.3: Language code must match supported Indic languages or regional locales.
    """
    # Valid languages
    valid_req = ChatRequest(query="Sea conditions", language="hi")
    assert valid_req.language == "hi"

    valid_locale = ChatRequest(query="Sea conditions", language="ta-IN")
    assert valid_locale.language == "ta-IN"

    # Invalid language code
    with pytest.raises(ValidationError) as exc_info:
        ChatRequest(query="Sea conditions", language="invalid_lang_code_123")
    assert "language" in str(exc_info.value)


def test_input_validation_coordinate_bounds():
    """
    Task 3.3: Latitude must be [-90, 90] and longitude [-180, 180].
    """
    # Invalid latitude
    with pytest.raises(ValidationError) as exc_info:
        ChatRequest(query="Test", latitude=999.0, longitude=84.0)
    assert "latitude" in str(exc_info.value)

    # Invalid longitude
    with pytest.raises(ValidationError) as exc_info:
        ChatRequest(query="Test", latitude=19.0, longitude=-500.0)
    assert "longitude" in str(exc_info.value)
