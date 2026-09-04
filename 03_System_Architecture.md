# System Architecture — ORCA

> **v2 revision note:** aligned to the "ORCA SIH Detailed Project Documentation
> v2 (Tourist)" spec. Adds an explicit **Advisory/RAG Agent** node, a formal
> **LangGraph state schema**, a **security rule** (role is never trusted from
> the browser), and a **failure/data-honesty strategy** (LIVE/CACHED/DEMO).
> Frontend (already built) is structurally unaffected.

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       CLIENT (Browser/Mobile)                         │
│   Next.js React App (already built) — Monitor | AI Chat | Alerts |    │
│   Profile | Guide (URL-only)                                          │
│   Auth: Supabase JS client (direct login/signup/session)              │
└───────────────┬─────────────────────────────────┬─────────────────────┘
                │ HTTPS + Bearer: Supabase JWT      │ Supabase Realtime (WS,
                │ (REST + SSE for chat streaming)   │  direct from client)
┌───────────────▼─────────────────────────────────┐│
│                  FASTAPI BACKEND (Python)         ││
│  Routers: /chat  /map-layers  /alerts  /export    ││
│           /profile  /activity                     ││
│  ┌──────────────────────────────────────────────┐││
│  │ Auth dependency: verifies Supabase JWT,       │││
│  │ DERIVES role/activity from profiles table —   │││
│  │ never trusts a role sent by the browser       │││
│  └──────────────────────────────────────────────┘││
│  ┌──────────────────────────────────────────────┐││
│  │ LANGGRAPH — role-aware ORCA graph (see §2)     │││
│  └──────────────────────────────────────────────┘││
│  ┌──────────────────────────────────────────────┐││
│  │ Ingestion jobs (APScheduler): pull INCOIS/     │││
│  │ Bhuvan/Open-Meteo/IMD → normalize →            │││
│  │ `observations` + `data_sources` tables         │││
│  └──────────────────────────────────────────────┘││
└───────────────┬───────────────────────────────────┘│
                │ SQLAlchemy/asyncpg + supabase-py      │
┌───────────────▼───────────────────────────────────▼──────────────────┐
│                 SUPABASE (Postgres + PostGIS + pgvector)              │
│  Tables (v2 schema — see `04_Design_Document.md` §4):                │
│  profiles, tourist_preferences, conversations, messages, locations,  │
│  data_sources, observations, map_features, risk_assessments,         │
│  activity_assessments, documents, document_chunks, feedback,         │
│  audit_events                                                        │
│  + Supabase Auth (issues JWTs) + Storage + Realtime                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Two independently deployable services:** Next.js frontend (Vercel) and
FastAPI backend (Render/Railway), sharing one Supabase project. Supabase
Realtime is subscribed to **directly by the frontend** for alert push — not
proxied through FastAPI.

## 2. Multi-Agent System (LangGraph, role-aware)

```
User Query (+ role + activity + location + time_window)
        ↓
   Planner Agent  ← identifies role + activity + intent + location + time
        ↓
  ┌──────────────┬──────────────┬──────────────┐
  ↓              ↓              ↓
Weather        Ocean          GIS
Agent          Agent          Agent
  ↓              ↓              ↓
  └──────────────┴──────────────┘
        ↓
  Advisory / RAG Agent  ← retrieves grounding docs (regulations, safety
        ↓                  guidance, tourism advisories) via pgvector
  Activity Suitability + Risk  ← DETERMINISTIC, not an LLM call
        ↓
  Recommendation Agent  ← explains the result; does not invent measurements
        ↓
  Chat + Map + Evidence (final_response, sources, map highlight)
```

| Node | Type | Responsibility | Tools / inputs |
|---|---|---|---|
| **Planner Agent** | LLM agent | Identifies role, activity, intent, location, time window from the query + profile context; decides which specialists to invoke (see §2.2 routing table) | none directly — routes only |
| **Weather Agent** | LLM agent | Wind speed, wave height, forecast, storm/lightning | `get_weather`, `get_cyclone_track` |
| **Ocean Agent** | LLM agent | SST, chlorophyll, PFZ zones | `get_sst`, `get_chlorophyll`, `get_pfz` |
| **GIS Agent** | LLM agent | Nearby beaches/POIs, distance to restricted/protected areas, point-in-polygon, viewport queries | `get_nearby_features`, `intersect_zone`, `get_bbox_features` (PostGIS via GeoAlchemy2) |
| **Advisory / RAG Agent** | LLM agent | Retrieves relevant chunks from `document_chunks` (regulations, safety guidance, tourism advisories) and surfaces source titles | `rag_search` (pgvector similarity) |
| **Activity Suitability + Risk** | **Deterministic Python function** (not an LLM call) | Combines Weather/Ocean/GIS/Advisory outputs against threshold rules → `risk_result` + `activity_suitability` (score: LOW/MODERATE/HIGH/UNSUITABLE + factors + explanation) | none — pure logic |
| **Recommendation Agent** | LLM agent | Turns risk/suitability + role + activity into the final natural-language answer with citations/badges/chart data | consumes `risk_result`, `activity_suitability`, `sources` |

**5 LLM agents** (Planner, Weather, Ocean, GIS, Advisory/RAG) **+ Recommendation Agent as a 6th**, comfortably exceeding the "collaborative agents" bar, with the actual safety/suitability score kept deterministic and reproducible.

### 2.1 LangGraph state schema
```json
{
  "user_id": "...",
  "role": "tourist",
  "language": "en",
  "activity": "beach_visit",
  "user_query": "...",
  "location": {"...": "..."},
  "time_window": {"...": "..."},
  "intent": "...",
  "weather_result": {"...": "..."},
  "ocean_result": {"...": "..."},
  "gis_result": {"...": "..."},
  "advisory_result": {"...": "..."},
  "risk_result": {"...": "..."},
  "activity_suitability": {"...": "..."},
  "sources": ["..."],
  "errors": ["..."],
  "final_response": "..."
}
```
This state object flows through the whole graph — every node reads what it needs and writes its own result key, so the full reasoning trace is inspectable (and loggable to `audit_events`).

### 2.2 Activity-based routing (example: Tourist)
```
tourist + beach_visit       → weather + ocean + advisory + GIS
tourist + boating           → weather + ocean + advisory + GIS
tourist + sightseeing       → weather + GIS + advisory        (skips ocean)
tourist + water_recreation  → weather + ocean + advisory + GIS
```
The Planner applies an equivalent routing table per role — not every query needs every specialist (e.g. a pure SST-trend Researcher question skips GIS entirely). **Do not build a separate agent graph per role** — one shared graph, routed differently.

### 2.3 Per-message flow
1. **User message received** via `POST /chat`, with the Supabase JWT verified and role/activity derived server-side from `profiles`/`tourist_preferences` (never trusted from the request body — see §3.3).
2. **Planner Agent** identifies intent, activity, location, time window and decides which specialists to invoke.
3. **Specialist agents run** (async, parallel via `asyncio.gather` where more than one is invoked).
4. **Advisory/RAG Agent** retrieves grounding documents relevant to the query/role/activity.
5. **Activity Suitability + Risk** (deterministic) combines all of the above into a score + factors + explanation.
6. **Recommendation Agent** synthesizes everything into the final role-appropriate answer, citing sources.
7. **Response streamed back** (SSE), rendered as text + inline widgets, with the **actual agent workflow visible** in the UI (Planner → Weather → Ocean → GIS → Advisory → Suitability → Risk → Recommendation) — never a fake progress animation (v2 spec, Phase 2B).
8. **Persisted** to `conversations`/`messages`, with `risk_assessments`/`activity_assessments` as separate auditable records, and the full graph state (or a summary of it) logged to `audit_events`.

## 3. Role-Based Response Shaping
The Recommendation Agent applies persona-conditioned formatting on top of the shared pipeline, weighted per the signal table in `01_PRD.md` §4.2:
- Tourist → suitability score + best time window + key reasons + warnings + sources, plain language, never "safe" — "more suitable based on available conditions."
- Fisher → PFZ + operational safety verdict + reasons + sources.
- Authority → severity-tagged summary + affected-population estimate + map heat overlay.
- Researcher → data/chart + export link + methodology note.
- Disaster Management → hazard/affected-area focus.
- General → plain conditions summary, no persona-specific framing.

## 4. Security Rule (from v2 spec §3.3)
> **Never trust a role sent by the browser.** The backend derives the
> authoritative role from the authenticated user's profile. UI role selection
> is only a user-facing choice during onboarding or profile editing — it is
> never read as an authorization signal on any request.

Concretely: every FastAPI route that needs role/activity looks it up from
`profiles`/`tourist_preferences` via the verified `user_id`, ignoring any
`role` field the client might include in a request body.

## 5. Failure & Data-Honesty Strategy (from v2 spec §3.4)
```
External source available?
  YES → retrieve + timestamp + source → label LIVE
  NO  → cached/demo fixture, only if permitted for that context
        → label CACHED or DEMO
        → never pretend fallback data is live

Agent failure → record error in `errors` (graph state) / audit_events
             → continue if safe to do so with reduced scope
             → lower confidence / explicitly explain the limitation to the user
```
This is enforced at the `data_sources`/`observations` layer (every observation row carries its source and an implicit mode via `data_sources.reliability`/freshness) and surfaced in the Recommendation Agent's output — sources are always shown with their retrieval time.

## 6. Data Model Domains
See `04_Design_Document.md` §4 for the full v2 schema. Domains:
- **Identity:** `profiles` (role — locked, derived server-side), `tourist_preferences`
- **Conversation:** `conversations`, `messages`
- **Personalization:** `locations` (saved places)
- **Data & provenance:** `data_sources` (registry, reliability, updated_at), `observations` (normalized readings, replaces separate SST/chlorophyll/weather tables)
- **Geospatial:** `map_features` (beaches, POIs, zones)
- **Auditable outputs:** `risk_assessments`, `activity_assessments`
- **RAG:** `documents`, `document_chunks` (pgvector embedding)
- **Quality/trust:** `feedback`, `audit_events`

## 7. Alerting Pipeline
1. **APScheduler job inside FastAPI** periodically pulls weather/cyclone data via `httpx`, writes to `observations` with `data_sources` provenance.
2. **Activity Suitability + Risk** module (same deterministic code used in the chat flow) evaluates thresholds against fresh observations.
3. New/updated alert-worthy conditions written as `risk_assessments` rows and/or into an `alerts`-equivalent surfaced via `map_features`/dedicated alert rows — using the Supabase **service role key** (FastAPI-only, never exposed to the frontend).
4. **Supabase Realtime** pushes the change directly to connected clients.
5. Notification dispatch (if added) is a FastAPI background task.

## 8. Deployment Topology
- `apps/web` → **Vercel**, unchanged.
- `services/api` → **Render or Railway**, Docker-based.
- Supabase project → shared by both services.
- Secrets (`SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) live only in FastAPI's env; frontend only holds `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`.
