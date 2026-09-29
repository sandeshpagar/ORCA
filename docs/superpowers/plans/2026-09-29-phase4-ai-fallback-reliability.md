# Phase 4: AI Fallback Reliability & OpenRouter Diagnosis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a bulletproof, 3-tier AI fallback cascade (OpenRouter Free Tier $\rightarrow$ Local Ollama with Fast-Skip $\rightarrow$ Deterministic Maritime Safety Rule Engine), resolve the OpenRouter 401 "User not found" root cause, and verify crash-free resilience under all fault conditions (401, 429, 5xx, timeouts, malformed payloads, connection refused) using Test-Driven Development (TDD).

**Architecture:** 
1. **Tier 1 (OpenRouter Free Tier)**: Multi-model resilient pool (`liquid/lfm-2.5-2.6b:free`, `qwen/qwen3.8-27b:free`, `google/gemma-4-31b-it:free`, etc.) with 6.0s timeout and automatic iteration on 429/5xx/timeout.
2. **Tier 2 (Local Ollama)**: 1.5s connect timeout with a 300s offline latch to avoid slowing down requests when Ollama is offline or uninstalled.
3. **Tier 3 (Deterministic Rule Engine)**: Zero-network mathematical safety engine evaluating physical maritime thresholds across all 5 operational roles (`fisher`, `tourist`, `authority`, `researcher`, `disaster_management`), strictly enforcing PRD §8 data honesty.

**Architecture Diagram:**

```mermaid
graph TD
    UserQuery[Incoming User Query & Context] --> ModelSelection{Selected Model?}
    
    ModelSelection -->|Deterministic / Rule| Tier3[Tier 3: Pure Deterministic Safety Engine]
    ModelSelection -->|OpenRouter or Auto| Tier1[Tier 1: OpenRouter Free Models]
    ModelSelection -->|Ollama Explicit| Tier2[Tier 2: Local Ollama]

    subgraph "Tier 1: Cloud LLM"
        Tier1 --> TestOR{HTTP 200 & Non-empty?}
        TestOR -->|Yes| FormatOR[Return OpenRouter Synthesis + Badge]
        TestOR -->|429/5xx/Timeout/401| NextOR{More Free Models?}
        NextOR -->|Yes| TryNextModel[Try Next Free Model] --> TestOR
        NextOR -->|No| Tier2
    end

    subgraph "Tier 2: Local Inference"
        Tier2 --> LatchCheck{Ollama Offline Latched?}
        LatchCheck -->|Yes (< 300s)| Tier3
        LatchCheck -->|No| ConnectOllama[Connect to 127.0.0.1:11434 with 1.5s timeout]
        ConnectOllama --> TestOllama{HTTP 200 & Valid?}
        TestOllama -->|Yes| FormatOllama[Return Ollama Synthesis + Badge]
        TestOllama -->|Connection Refused / Timeout| LatchOllama[Latch Offline for 300s] --> Tier3
    end

    subgraph "Tier 3: Zero-Crash Safety Net"
        Tier3 --> RuleEngine[Mathematical Threshold Evaluation]
        RuleEngine --> PRD8Honesty[Format Grounded Advisory + 'deterministic' tag]
    end
```

**Tech Stack:** FastAPI, Pydantic v2, Pydantic-Settings, HTTPX (async client), LangGraph, Pytest, Pytest-Asyncio.

**Spec:** `docs/superpowers/plans/2026-09-29-phase4-ai-fallback-reliability.md`

## Global Constraints
- Python virtual environment: `services/api/.venv/Scripts/python.exe`
- Pytest test runner: `services/api/.venv/Scripts/pytest.exe services/api/tests`
- Never leak or log unmasked secret keys.
- Preserve 100% of existing 87 passing tests without deletion or weakening.
- Zero network dependencies for Tier 3 deterministic fallback.
- Strictly adhere to PRD §8 data honesty (no fabricated sensor metrics or safety claims).

---

### Task 4.1: OpenRouter Key Resolution & Config Loading Fix

**Files:**
- Modify: `services/api/app/config.py:88-115`
- Test: `services/api/tests/test_config.py`

**Interfaces:**
- Consumes: `services/api/.env` and system environment variables
- Produces: `settings.OPENROUTER_API_KEY` (guaranteed valid $\ge 30$ chars when present in file, overriding dead system environment variables)

- [ ] **Step 1: Write the failing test for OpenRouter key loading precedence**

```python
def test_openrouter_key_prefers_valid_env_file_over_stale_system_env(monkeypatch, tmp_path):
    """Verify that a truncated or invalid system env var does not override a valid key from .env file."""
    from app.config import Settings
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-v1-stale18chars")
    # When initialized, Settings validator must discard stale < 30 char key if file or default provides valid key
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_config.py -k test_openrouter_key_prefers_valid_env_file_over_stale_system_env`
Expected: FAIL

- [ ] **Step 3: Implement fix in config.py**

Modify `load_openrouter_key` in `services/api/app/config.py` to:
1. Verify whether `api_env_file` contains a valid key ($\ge 30$ chars).
2. If `os.environ.get("OPENROUTER_API_KEY")` is truncated (< 30 chars) or matches known dead values, discard it and use the `.env` key.
3. Synchronize `os.environ["OPENROUTER_API_KEY"]` with the valid key so child processes and libraries also see the valid key.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_config.py -k test_openrouter_key_prefers_valid_env_file_over_stale_system_env`
Expected: PASS

---

### Task 4.2: Tier 2 Fast-Skip Optimization & Hard Timeouts

**Files:**
- Modify: `services/api/app/llm/fallback_client.py:40-140`
- Test: `services/api/tests/test_fallback_client.py`

**Interfaces:**
- Consumes: `settings.LLM_TIMEOUT_SECONDS`, `settings.OLLAMA_BASE_URL`
- Produces: `_call_ollama` with 1.5s connect timeout and 300s offline latching; `_call_openrouter_model` with 6.0s hard timeout.

- [ ] **Step 1: Write the failing test for Ollama fast-skip latching**

```python
@pytest.mark.asyncio
async def test_ollama_connection_failure_latches_offline_for_300s():
    client = FallbackLLMClient()
    client._ollama_offline_until = 0.0
    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("Connection refused")):
        res = await client._call_ollama([{"role": "user", "content": "hi"}], force_check=False)
        assert res is None
        assert client._ollama_offline_until > time.time() + 250.0  # Latched for 300s
```

- [ ] **Step 2: Run test to verify failure**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_fallback_client.py -k test_ollama_connection_failure_latches_offline_for_300s`
Expected: FAIL (currently latched for only 60s).

- [ ] **Step 3: Implement 1.5s connect timeout and 300s offline latch in fallback_client.py**

Update `FallbackLLMClient`:
- Set `connect_t = 1.5` for local calls.
- Set `self._ollama_offline_until = time.time() + 300.0` upon `httpx.ConnectError` or `httpx.ConnectTimeout`.
- Add active candidate free models (`liquid/lfm-2.5-2.6b:free`, `qwen/qwen3.8-27b:free`, `google/gemma-4-31b-it:free`) at the head of `OPENROUTER_FREE_MODELS`.
- Support extracting text from `message.reasoning` if `message.content` is null in reasoning-first models.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_fallback_client.py -k test_ollama_connection_failure_latches_offline_for_300s`
Expected: PASS

---

### Task 4.3: Fault Injection & Full Cascade Unit Tests

**Files:**
- Create: `services/api/tests/test_cascade.py`
- Test: `services/api/tests/test_cascade.py`

**Interfaces:**
- Tests all failure modes:
  - 401 Unauthorized (Invalid key)
  - 429 Too Many Requests (Rate limit)
  - 500 / 503 Internal Server Error
  - TimeoutException
  - Malformed JSON / Unexpected structure
  - Empty response choices
  - Connection refused

- [ ] **Step 1: Write test cases in test_cascade.py**

Write parameterized tests mocking `httpx.AsyncClient.post` for:
1. `test_cascade_openrouter_401_falls_back_to_ollama_or_deterministic`
2. `test_cascade_openrouter_500_server_error_falls_back`
3. `test_cascade_timeout_falls_back`
4. `test_cascade_malformed_json_falls_back_cleanly`
5. `test_cascade_empty_choices_falls_back`
6. `test_cascade_end_to_end_guarantees_no_exception`

- [ ] **Step 2: Run test suite to verify tests pass**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_cascade.py -v`
Expected: PASS

---

### Task 4.4: Tier 3 Threshold Edge Boundary Tests

**Files:**
- Modify: `services/api/tests/test_suitability_engine.py`
- Consumes: `evaluate_activity_suitability`

- [ ] **Step 1: Write table-driven boundary tests**

Add edge tests for:
- Wave heights: 1.39m vs 1.40m, 1.79m vs 1.80m, 2.49m vs 2.50m.
- Wind speeds: 27.9 km/h vs 28.0 km/h, 44.9 km/h vs 45.0 km/h.
- Precipitation and convective hazards (rain vs thunderstorm).
- Role variations: `fisher` vs `tourist` vs `authority` vs `researcher` vs `disaster_management`.
- Strict PRD §8 check: zero occurrences of "absolutely safe" or "100% safe" across all outputs.

- [ ] **Step 2: Run tests to verify**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_suitability_engine.py -v`
Expected: PASS

---

### Task 4.5: UI Model Badge & Provenance Verification

**Files:**
- Test: `services/api/tests/test_chat_schema.py`
- Verify: Next.js Chat interface displays correct badge corresponding to `model_used` and data source honesty tag (`LIVE`, `CACHED`, `DEMO`).

- [ ] **Step 1: Verify API response contract**

Ensure `model_used` string is returned faithfully in `ChatResponse`:
- `"openrouter/liquid-lfm"` or `"openrouter/..."` when Tier 1 succeeds.
- `"ollama/llama3.2"` when Tier 2 succeeds.
- `"deterministic"` when Tier 3 safety engine produces the response.

- [ ] **Step 2: Run full backend and frontend validation**

Run:
1. `.\services\api\.venv\Scripts\pytest.exe services/api/tests -q` (All tests must be green)
2. `npx tsc --noEmit` (TypeScript must compile cleanly)
