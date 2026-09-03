# System Architecture — ORCA

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CLIENT (Browser/Mobile)                   │
│   Next.js React App — Chat UI | Map (MapLibre+deck.gl) | Dashboards  │
└───────────────┬─────────────────────────────────┬────────────────────┘
                │ HTTPS/REST/SSE                   │ Supabase Realtime (WS)
┌───────────────▼─────────────────────────────────▼────────────────────┐
│                    NEXT.JS API ROUTES (Backend-for-Frontend)          │
│  /api/chat  /api/map-layers  /api/alerts  /api/export  /api/auth/*   │
└───────────────┬──────────────────────┬────────────────┬──────────────┘
                │                      │                │
      ┌─────────▼────────┐   ┌─────────▼────────┐  ┌────▼─────────────┐
      │  Agent Orchestr.  │   │  Data Access      │  │ Alert Engine     │
      │  (LangGraph/LLM   │   │  Layer (queries   │  │ (cron/edge fn →  │
      │  tool-calling)    │   │  Supabase/PostGIS)│  │ evaluates thresh-│
      │  Tools:           │   │                   │  │ olds → inserts   │
      │  - get_sst        │   └─────────┬─────────┘  │ alerts row)      │
      │  - get_chloro     │             │            └────┬─────────────┘
      │  - get_weather     │             │                 │
      │  - get_pfz         │             │                 │
      │  - get_alerts      │             │                 │
      │  - rag_search      │             │                 │
      └─────────┬──────────┘             │                 │
                │ (calls)                 │                 │
┌───────────────▼─────────────────────────▼─────────────────▼──────────┐
│                        SUPABASE (Postgres + PostGIS + pgvector)       │
│  Tables: users, profiles, roles, sst_data, chlorophyll_data,         │
│  weather_data, pfz_zones, alerts, saved_locations, chat_history,     │
│  knowledge_docs(embeddings)                                          │
│  + Supabase Auth + Supabase Storage + Supabase Realtime               │
└───────────────┬─────────────────────────────────────────────────────┘
                │ scheduled ingestion (cron / edge function trigger)
┌───────────────▼─────────────────────────────────────────────────────┐
│         INGESTION MICROSERVICE (optional, Python FastAPI)             │
│  Pulls: INCOIS PFZ, Open-Meteo Marine, IMD bulletins, sample ISRO EO  │
│  Normalizes → GeoJSON/time-series → writes to Supabase                │
└─────────────────────────────────────────────────────────────────────┘
```
*(Current trimmed build note: the client is 4 screens — Style Guide, Monitor, AI Chat, Alerts — designed in Stitch and generated via Antigravity. "Dashboards" referenced anywhere in this doc means the role-aware widget panel inside the single Monitor screen, not separate dashboard routes. See `04_Design_Document.md` §0.1.)*

## 2. Agentic AI Flow (per chat message)
1. **User message received** (with context: role, current map viewport, selected location if any).
2. **Intent classification** — agent decides: data lookup / comparison / advisory / export / general Q&A.
3. **Tool selection & call** — agent invokes one or more tools (`get_sst`, `get_weather`, `get_alerts`, `rag_search`, etc.) with parameters (lat/lon/region, date range).
4. **Data retrieval** — Data Access Layer queries Supabase/PostGIS, returns structured JSON.
5. **Synthesis** — LLM composes a role-aware natural-language answer + structured payload (map layer to highlight, chart data, safety badge).
6. **Response render** — frontend renders text + inline widgets (mini-map, chart, alert card) + cites data source/timestamp.
7. **Persisted** — chat turn + retrieved sources logged to `chat_history` for auditability/history.

## 3. Role-Based Response Shaping
Single agent, persona-conditioned system prompt + output formatter:
- Fisherman → short verdict, PFZ overlay, local language option.
- Researcher → data table/chart + export link + methodology note.
- Coastal Authority → severity-tagged alert summary + affected-population estimate + map heat overlay.
- Tourist → safety badge (green/yellow/red) + plain-language explanation, no jargon.
- Maritime Operator → route-safety summary + hazard list along route.

## 4. Data Model Domains (see Design Document for full schema)
- **Identity:** `users`, `profiles` (role, preferred_language, home_region)
- **Oceanographic:** `sst_readings`, `chlorophyll_readings`, `weather_forecasts` (all geo-indexed via PostGIS `geometry`/`geography` columns, time-indexed)
- **Zones/Advisories:** `pfz_zones`, `alerts` (type, severity, geom polygon, valid_from/to)
- **Personalization:** `saved_locations`, `notification_subscriptions`
- **Conversation:** `chat_sessions`, `chat_messages`, `chat_message_sources`
- **RAG:** `knowledge_docs` (content + `vector` embedding column via pgvector)

## 5. Alerting Pipeline
1. Ingestion service/edge function periodically fetches weather/cyclone data.
2. A rules engine (simple threshold checks: wind speed, wave height, cyclone proximity) evaluates against `alerts` criteria.
3. New/updated alert rows inserted into `alerts` table (PostGIS polygon for affected region).
4. Supabase Realtime pushes change → connected clients update map + show banner.
5. Users with matching `notification_subscriptions` (by region) get in-app + (stretch) email notification via Supabase Edge Function + Resend/SendGrid.

## 6. Security Architecture
- **Supabase Auth** issues JWT; role stored in `profiles.role` and mirrored into JWT custom claim (via Postgres function/trigger) for RLS checks.
- **Row-Level Security (RLS)** on all user-scoped tables (`saved_locations`, `chat_sessions`, `notification_subscriptions`) — a user can only read/write their own rows.
- Reference/oceanographic data tables are public-read (no PII), write-restricted to service role (ingestion pipeline only).
- API routes validate JWT server-side before calling privileged operations.
- Exported files served via **signed URLs** (short expiry) from Supabase Storage.

## 7. Scalability Notes (post-hackathon path)
- Swap mock/public data ingestion for real ISRO Bhuvan/MOSDAC feeds — only the ingestion microservice changes, rest of the architecture is unaffected.
- Move agent orchestration to a dedicated service (separate from Next.js API routes) if concurrency grows.
- Add tile server (e.g., Martin/pg_tileserv) for large raster SST layers instead of client-side GeoJSON if data volume grows.
- Read replicas / connection pooling (Supabase supports PgBouncer) as user load grows.

## 8. Deployment Topology
- `apps/web` → Vercel (auto-deploy on push to `main`).
- Supabase project → hosted DB/Auth/Storage/Realtime.
- `services/ingestion` (if used) → Render/Railway, triggered by cron (or Supabase scheduled Edge Function calling it).
- Environment secrets (LLM API key, Supabase service role key, data source keys) via Vercel/Render env vars — never in repo.
