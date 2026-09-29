# Phase 5: External Data Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build resilient ingestion and caching for external maritime data (Open-Meteo Weather/Marine, INCOIS coastal advisories, Survey of India/GIS, and Earth Observation data), ensuring graceful degradation under network failures (timeouts, 429 rate limits, 5xx errors, schema changes, malformed payloads), bounded-memory TTL caching with explicit stale provenance, and zero silent suppression of safety-critical high-wave and cyclone warnings.

**Architecture:**
1. **Bounded TTL In-Memory Cache (`services/api/app/adapters/cache.py`)**:
   - Thread-safe, bounded-capacity cache (max 500 entries) with LRU eviction to prevent memory leaks.
   - Configurable TTL (default 15 minutes / 900s for live marine observations).
   - Dual retrieval mode: `get_fresh()` for current data, and `get_stale()` for fallback when upstream sensors are unreachable.
2. **Resilient Open-Meteo Adapter (`services/api/app/adapters/open_meteo.py`)**:
   - Guard against timeouts (`OPEN_METEO_TIMEOUT_SECONDS`), upstream 429s, 502/503/504 gateway errors, and malformed/empty JSON.
   - Stale-while-revalidate fallback: If upstream fails and cached data exists, return the cached telemetry with `reliability="CACHED"` and a clear timestamp provenance disclaimer.
   - Zero-fabrication honest fallback: If no cache exists, raise `OpenMeteoError` cleanly so `reliability="DEMO"` is served without fake measurements.
3. **Safety-Critical Alert Safeguard (`services/api/app/graph/nodes/advisory_rag.py`)**:
   - Official INCOIS High Wave Alerts and Cyclone Bulletins are never silently dropped.
   - If advisory feeds are stale or unverified, emit a mandatory safety warning banner directing mariners to official VHF Channel 16 / INCOIS channels.

**Architecture Diagram:**

```mermaid
graph TD
    Client[Specialist Agent Request] --> CacheCheck{Cache Hit & Fresh?}
    CacheCheck -->|Yes (< 15 min)| ReturnFresh[Return Fresh Observation + 'LIVE']
    CacheCheck -->|No / Miss| UpstreamCall[Call Open-Meteo / INCOIS API with 8s Timeout]

    subgraph "Resilient Ingestion Gateway"
        UpstreamCall --> RespCheck{Status 200 & Valid JSON?}
        RespCheck -->|Yes| UpdateCache[Update Bounded LRU Cache max=500] --> ReturnLive[Return Live Data + 'LIVE']
        RespCheck -->|Timeout / 429 / 5xx / Bad JSON| StaleCheck{Stale Cache Entry Available?}
        StaleCheck -->|Yes| ReturnStale[Return Stale Data + 'CACHED' + Provenance Warning]
        StaleCheck -->|No| ZeroFabrication[Honest Error: 'DEMO' / Zero Fabricated Measurements]
    end
```

**Tech Stack:** FastAPI, Pydantic v2, HTTPX (async), Python `collections.OrderedDict`, Pytest, Pytest-Asyncio.

**Spec:** `docs/superpowers/plans/2026-09-29-phase5-external-data-resilience.md`

## Global Constraints
- Python virtual environment: `services/api/.venv/Scripts/python.exe`
- Pytest test runner: `services/api/.venv/Scripts/pytest.exe services/api/tests`
- Never leak secrets in logs or responses.
- In-memory cache must have a strict capacity cap (`maxsize=500`) to prevent memory leaks in production.
- Stale data must NEVER masquerade as `LIVE`. Must carry `reliability="CACHED"` and observation timestamp.
- Preserve 100% of existing 106 passing tests.

---

### Task 5.1: Bounded TTL Cache Module (`services/api/app/adapters/cache.py`)

**Files:**
- Create: `services/api/app/adapters/cache.py`
- Test: `services/api/tests/test_external_data_resilience.py`

**Interfaces:**
- Produces: `TelemetryCache` class with `get(key)`, `set(key, val, ttl)`, `get_stale(key)`, `clear()`, `size()`.
- Thread-safe, bounded capacity (`maxsize=500`), LRU eviction.

- [ ] **Step 1: Write the failing test for Bounded TTL Cache**

```python
def test_ttl_cache_expiry_and_stale_retrieval():
    cache = TelemetryCache(maxsize=10, default_ttl_seconds=1.0)
    cache.set("key1", {"temp": 28.0})
    assert cache.get("key1") is not None
    time.sleep(1.1)
    assert cache.get("key1") is None  # Fresh expired
    stale_val, age_seconds = cache.get_stale("key1")
    assert stale_val == {"temp": 28.0}
    assert age_seconds >= 1.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_external_data_resilience.py -k test_ttl_cache_expiry_and_stale_retrieval`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement TelemetryCache in services/api/app/adapters/cache.py**

Implement `TelemetryCache` using `collections.OrderedDict` and `asyncio.Lock` / thread lock:
- Strict maxsize enforcement with eviction of oldest key.
- Store `(value, expires_at, created_at)`.
- Methods: `get_fresh`, `get_stale`, `set`, `delete`, `clear`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_external_data_resilience.py -k test_ttl_cache_expiry_and_stale_retrieval`
Expected: PASS

---

### Task 5.2: Open-Meteo Ingestion Resilience & Stale Fallback

**Files:**
- Modify: `services/api/app/adapters/open_meteo.py`
- Test: `services/api/tests/test_external_data_resilience.py`

**Interfaces:**
- Consumes: `TelemetryCache`
- Produces: `fetch_open_meteo_marine_data(latitude, longitude, client)` returning cached/stale data on failure or honest error when no cache.

- [ ] **Step 1: Write failing tests for Open-Meteo resilience**

Write tests in `test_external_data_resilience.py`:
- `test_open_meteo_timeout_falls_back_to_stale_cache_with_warning`
- `test_open_meteo_http_500_falls_back_to_stale_cache`
- `test_open_meteo_http_429_rate_limit_handled`
- `test_open_meteo_malformed_json_does_not_crash`
- `test_open_meteo_empty_current_block_handled`

- [ ] **Step 2: Run tests to verify they fail**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_external_data_resilience.py -k "test_open_meteo"`
Expected: FAIL

- [ ] **Step 3: Implement resilience & stale fallback in open_meteo.py**

Update `fetch_open_meteo_marine_data`:
- Cache key: `f"{round(latitude, 2)}:{round(longitude, 2)}"`
- Check cache before external call.
- On exception (timeout, 5xx, 429, malformed JSON):
  - Query `get_stale(cache_key)`.
  - If found, return metrics with `reliability="CACHED"`, provenance message with age in minutes, and `is_live=False`.
  - If not found, raise `OpenMeteoError`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_external_data_resilience.py -k "test_open_meteo"`
Expected: PASS

---

### Task 5.3: Safety-Critical Alerts & High Wave Warning Safeguards

**Files:**
- Modify: `services/api/app/graph/nodes/advisory_rag.py`
- Test: `services/api/tests/test_external_data_resilience.py`

**Interfaces:**
- Consumes: Grounding advisories and knowledge base
- Produces: Preserved high wave alerts and cyclone warnings; explicit disclaimer if feed is stale or unverified.

- [ ] **Step 1: Write failing test for safety alerts safeguard**

```python
def test_safety_critical_high_wave_alert_never_silently_dropped():
    # Verify that when advisory data contains high wave alert, it is prominently included in warnings
```

- [ ] **Step 2: Run test to verify failure**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_external_data_resilience.py -k test_safety_critical_high_wave_alert_never_silently_dropped`
Expected: FAIL / PASS depending on assertions.

- [ ] **Step 3: Implement safety alert safeguard in advisory_rag.py**

Ensure that high wave alerts (INCOIS High Wave Alert, Swell Surge warning, Cyclone Alert) are always prepended with highest priority and cannot be overwritten by general recreational guidelines.

- [ ] **Step 4: Run test to verify it passes**

Run: `.\services\api\.venv\Scripts\pytest.exe services/api/tests/test_external_data_resilience.py -k test_safety_critical_high_wave_alert_never_silently_dropped`
Expected: PASS

---

### Task 5.4: Multi-Worker & Redis Documentation / Architectural Note

**Files:**
- Modify: `docs/superpowers/plans/2026-09-29-phase5-external-data-resilience.md`
- Document:
  - In-memory cache is bounded to 500 items per worker process (~150KB RAM, zero memory leak).
  - Multi-worker scalability: If scaling horizontally to $N > 1$ Uvicorn workers or multiple containers, recommend Redis (`aioredis` / Upstash) for shared cross-worker caching.

- [ ] **Step 1: Document architectural note and production deployment guidelines**

---

### Task 5.5: Full Regression & TypeScript Verification

**Files:**
- Verify: Full pytest suite (`services/api/tests`)
- Verify: Frontend TypeScript (`npx tsc --noEmit`)

- [ ] **Step 1: Run pytest across all test files**
Expected: 106+ tests passing.

- [ ] **Step 2: Run TypeScript check**
Expected: Exited 0 with no errors.
