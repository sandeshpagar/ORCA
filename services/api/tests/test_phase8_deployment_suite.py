import json
import logging
import pytest
from httpx import AsyncClient
from app.security.usage_guard import OpenRouterDailyUsageGuard
from app.security.logger import sanitize_log_message, StructuredJsonFormatter


def test_openrouter_usage_guard_enforces_daily_limits():
    """Verify that OpenRouterDailyUsageGuard accurately restricts calls within the sliding window."""
    guard = OpenRouterDailyUsageGuard(default_daily_limit=3, window_seconds=10)
    user_id = "test_user_quota"

    # Calls 1, 2, 3 should succeed
    for i in range(3):
        allowed, retry_after, remaining = guard.check_and_consume(user_id)
        assert allowed is True
        assert remaining == (2 - i)

    # 4th call must be blocked
    allowed, retry_after, remaining = guard.check_and_consume(user_id)
    assert allowed is False
    assert remaining == 0
    assert retry_after > 0

    # Reset allows immediate calls again
    guard.reset()
    allowed, retry_after, remaining = guard.check_and_consume(user_id)
    assert allowed is True


def test_sanitize_log_message_redacts_credentials_and_pii():
    """Verify that sensitive tokens, keys, passwords, and emails are redacted before logging."""
    raw_msg = (
        "User authenticated with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token.sig "
        "and key sk-or-v1-abcdef0123456789abcdef0123456789. "
        "password: SuperSecretPassword123! from contact user@marine.in"
    )
    sanitized = sanitize_log_message(raw_msg)

    assert "eyJhbGci" not in sanitized
    assert "Bearer [REDACTED_TOKEN]" in sanitized
    assert "sk-or-v1-abcdef0123456789" not in sanitized
    assert "sk-or-v1-[REDACTED_KEY]" in sanitized
    assert "SuperSecretPassword123!" not in sanitized
    assert "[REDACTED_PASSWORD]" in sanitized
    assert "user@marine.in" not in sanitized
    assert "[REDACTED_EMAIL]" in sanitized


def test_structured_json_formatter_outputs_valid_json():
    """Verify that StructuredJsonFormatter outputs well-formed JSON with required fields."""
    formatter = StructuredJsonFormatter()
    record = logging.LogRecord(
        name="app.test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Advisory telemetry dispatched for Gopalpur Sector with token Bearer abc.def.ghi",
        args=(),
        exc_info=None,
    )
    formatted = formatter.format(record)
    parsed = json.loads(formatted)

    assert parsed["level"] == "INFO"
    assert parsed["logger"] == "app.test"
    assert "Gopalpur Sector" in parsed["message"]
    assert "Bearer [REDACTED_TOKEN]" in parsed["message"]
    assert "abc.def.ghi" not in parsed["message"]
    assert "timestamp" in parsed
    assert "service" in parsed
    assert "environment" in parsed


@pytest.mark.asyncio
async def test_health_and_readiness_endpoints(client: AsyncClient):
    """Verify that /health and /ready endpoints return 200 OK for orchestrator probes."""
    res_health = await client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"

    res_ready = await client.get("/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "ready"
    assert res_ready.json()["database"] == "connected"
