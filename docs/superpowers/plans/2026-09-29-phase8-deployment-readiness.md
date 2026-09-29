# Phase 8: Production Deployment Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish end-to-end production deployment readiness for ORCA: multi-worker Uvicorn/Gunicorn production run configs, production multi-stage Dockerfiles for frontend and backend with orchestrating `docker-compose.yml`, structured privacy-safe JSON logging with Sentry error tracking hook, daily OpenRouter budget/spending guard with automatic Tier 2/3 cascading, custom Next.js 404/error boundaries, SVG favicon and metadata, mandatory UI marine safety disclaimer (PRD §8), and a comprehensive `DEPLOYMENT.md` guide.

**Architecture:**
1. **Container & Process Runner Architecture (`services/api/Dockerfile`, `Dockerfile`, `docker-compose.yml`)**:
   - Backend Dockerfile & Runner: Support configurable worker concurrency via `WEB_CONCURRENCY` env var (default: 4 workers). Production health checks against `/health` and `/ready`.
   - Frontend Dockerfile: Multi-stage Alpine container (`deps` -> `builder` -> `runner`) exposing port 3000, running non-root `next start`.
   - `docker-compose.yml`: Local & production staging stack running `orca-api` on port 8000 and `orca-frontend` on port 3000 with bridge network and health checks.
2. **Privacy-Preserving Structured Logging & Error Tracking (`services/api/app/security/logger.py`)**:
   - Structured JSON logging in production (standard ISO timestamps, correlation `incident_id`, route, status, duration).
   - Secret Masking: Redacts Bearer tokens, passwords, Supabase keys, and OpenRouter API keys before writing to stdout.
   - PII Sanitization: User queries containing emails or phone numbers are hashed/truncated.
   - Optional Sentry Hook: Dynamically attaches Sentry ASGI middleware if `SENTRY_DSN` is configured.
3. **OpenRouter Daily Usage & Spending Guard (`services/api/app/security/usage_guard.py`)**:
   - Tracks daily API request volume per user / guest session.
   - Configurable threshold via `OPENROUTER_DAILY_LIMIT_PER_USER` (default: 50 requests/user/day).
   - If quota is reached, gracefully and silently reroutes to Tier 2 (Ollama local inference) or Tier 3 (Deterministic rule engine), guaranteeing mariners always receive vital sea state advisories without incurring unexpected LLM cloud charges.
4. **Frontend Production Polish & Safety Disclaimer**:
   - Custom `app/not-found.tsx`: Thematic 404 page ("Navigational Sector Not Found") with route guidance back to the active advisory radar.
   - Custom `app/error.tsx`: Thematic error boundary with recovery action ("Reconnect Telemetry").
   - SVG Favicon (`public/favicon.ico`, `app/icon.svg`): Vector radar/marine icon for browser tabs.
   - Enhanced metadata in `app/layout.tsx` (OpenGraph, description, icons).
   - Prominent Maritime Safety Disclaimer Banner in chat UI and footer: "Official Broadcast Priority: ORCA is an AI advisory tool. In critical marine operations, mariners must strictly follow official INCOIS, IMD, and Indian Coast Guard broadcasts (VHF Ch 16 / NAVTEX)."
5. **Comprehensive Production Operations Guide (`DEPLOYMENT.md`)**:
   - Exhaustive documentation of all environment variables, security classifications, Docker launch commands, health endpoints, backup procedures, and instant rollback playbooks.

**Architecture Diagram:**

```mermaid
graph TD
    UserClient[Web Mariner Client] --> FrontContainer[Next.js 16 Container :3000]
    FrontContainer --> ReverseProxy[NGINX / Cloudflare Gateway]
    ReverseProxy --> APIContainer[FastAPI Multi-Worker Container :8000]

    subgraph "Production Container Grid"
        APIContainer --> UvicornCluster[Uvicorn Cluster 4 Workers]
        UvicornCluster --> SecurityMW[Security Headers & Structured Logger]
        SecurityMW --> UsageGuard{OpenRouter Daily Limit Exceeded?}
        UsageGuard -->|Under Quota| OpenRouter[OpenRouter Cloud LLM Tier 1]
        UsageGuard -->|Over Quota| OllamaOrRules[Ollama / Deterministic Tier 2/3 Fallback]
        SecurityMW --> HealthCheck[/health & /ready Endpoints]
    end

    subgraph "Safety & Disclaimer UI"
        FrontContainer --> DisclaimerBanner[PRD §8 Safety Disclaimer: VHF Ch 16 & INCOIS Primacy]
        FrontContainer --> ErrorBoundaries[Custom 404 & Error Fallbacks]
    end
```

**Tech Stack:** Docker, Docker Compose, Uvicorn, Python 3.11, Next.js 16, TypeScript, Tailwind CSS, Sentry SDK (optional hook).

**Spec:** `docs/superpowers/plans/2026-09-29-phase8-deployment-readiness.md`

## Global Constraints
- Python virtual environment: `services/api/.venv/Scripts/python.exe`
- Pytest test runner: `services/api/.venv/Scripts/pytest.exe services/api/tests`
- Frontend commands: `npm run lint`, `npm run build`
- Zero plain-text credentials in Dockerfiles, Compose files, or markdown guides.
- Maintain 100% passing tests (all 123 tests must pass).

---

### Task 8.1: OpenRouter Daily Spending Guard (`services/api/app/security/usage_guard.py`)

**Files:**
- Create: `services/api/app/security/usage_guard.py`
- Modify: `services/api/app/config.py`
- Modify: `services/api/app/llm/fallback_client.py`
- Test: `services/api/tests/test_phase8_deployment_suite.py`

**Step-by-step:**
1. In `app/config.py`, add `OPENROUTER_DAILY_LIMIT_PER_USER: int = 50`.
2. Create `OpenRouterDailyUsageGuard` class with in-memory thread-safe sliding 24-hour request counter.
3. In `fallback_client.py`: before attempting OpenRouter, check `usage_guard.is_allowed(user_id)`. If quota is exhausted, log notice and cascade immediately to Tier 2 (Ollama) or Tier 3 (Deterministic) without failing the request.

---

### Task 8.2: Structured Privacy-Safe Logging & Sentry Hook (`services/api/app/security/logger.py`)

**Files:**
- Create: `services/api/app/security/logger.py`
- Modify: `services/api/app/config.py`
- Modify: `services/api/app/main.py`
- Test: `services/api/tests/test_phase8_deployment_suite.py`

**Step-by-step:**
1. In `app/config.py`, add `SENTRY_DSN: Optional[str] = None` and `LOG_FORMAT: str = "text"`.
2. Create `setup_structured_logging(app: FastAPI)` in `services/api/app/security/logger.py`:
   - Redacts tokens, passwords, and API keys.
   - Provides structured JSON logging in production.
   - Conditionally initializes Sentry if `settings.SENTRY_DSN` is set.
3. Attach to FastAPI app lifespan in `app/main.py`.

---

### Task 8.3: Production Run Config, Dockerfiles & Docker Compose

**Files:**
- Modify: `services/api/Dockerfile`
- Create: `Dockerfile` (frontend multi-stage build)
- Create: `docker-compose.yml`

**Step-by-step:**
1. In `services/api/Dockerfile`: configure production entrypoint supporting configurable worker concurrency:
   `CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-4}"]`
2. Create root `Dockerfile` for Next.js 16:
   - Stage 1: `deps` (`npm ci`)
   - Stage 2: `builder` (`npm run build`)
   - Stage 3: `runner` (`node_modules`, `.next`, `public`, `npm start` on 3000)
3. Create root `docker-compose.yml`:
   - Services: `api` (port 8000, healthcheck on `/health`) and `frontend` (port 3000, depends_on api).

---

### Task 8.4: Frontend Custom 404, Error Boundaries, Favicon & Metadata

**Files:**
- Create: `app/not-found.tsx`
- Create: `app/error.tsx`
- Create: `app/icon.svg`
- Modify: `app/layout.tsx`

**Step-by-step:**
1. Create `app/not-found.tsx`: Institutional marine themed 404 page ("Navigational Sector Not Found") with redirect button to `/chat` and `/monitor`.
2. Create `app/error.tsx`: Error boundary with "Retry Connection" CTA.
3. Create `app/icon.svg`: High-resolution vector nautical / radar icon for browser tab favicon.
4. Update `app/layout.tsx` metadata with complete OpenGraph tags, description, and icon reference.

---

### Task 8.5: Prominent UI Marine Safety Disclaimer (PRD §8)

**Files:**
- Modify: `app/(app)/chat/page.tsx`
- Modify: `components/chat/ConversationDrawer.tsx`

**Step-by-step:**
1. Add an official Coastal Safety Notice bar in the chat header:
   `⚠️ OFFICIAL BROADCAST ADVISORY: ORCA is an AI decision-support tool. Mariners and coastal operators must strictly follow official INCOIS, IMD, and Indian Coast Guard broadcasts (VHF Ch 16 / NAVTEX).`
2. Ensure the notice displays cleanly on both mobile (360px) and desktop without obstructing input controls.

---

### Task 8.6: Comprehensive Production Operations Guide (`DEPLOYMENT.md`)

**Files:**
- Create: `DEPLOYMENT.md`

**Step-by-step:**
1. Document:
   - System Architecture Diagram & Data Flow.
   - Comprehensive Environment Variables Matrix (Backend & Frontend).
   - Docker & Docker Compose deployment instructions.
   - Systemd / Bare-Metal deployment scripts.
   - Healthcheck & Monitoring Endpoints (`/health`, `/ready`, `/api/admin/telemetry`).
   - Secret Management best practices.
   - Zero-Downtime Deployment & Instant Rollback Procedure.

---

### Task 8.7: End-to-End Verification & Master Production Verdict

**Files:**
- Verify: `npm run lint` -> clean 0
- Verify: `npm run build` -> clean 0
- Verify: `pytest services/api/tests -q` -> 100% pass (all 123+ tests)
- Output Phase 8 findings table and final release Go/No-Go verdict.
