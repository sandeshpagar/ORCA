# Tech Stack Document — ORCA

> **v2 revision note:** aligned to the "ORCA SIH Detailed Project Documentation
> v2 (Tourist)" spec. Core stack confirmed: **Next.js + TypeScript (frontend,
> already built) • FastAPI + Python (backend) • LangGraph (agents) • Supabase
> (Postgres + PostGIS + pgvector + Auth + Storage) • MapLibre/Leaflet •
> deterministic Risk/Suitability Engine.** New in this revision: scientific
> processing libs promoted to primary (not just future-proofing), an explicit
> evals layer, and a documented LLM-boundary principle.
>
> **Zero-cost revision note:** §5 now specifies a **layered, auto-failover
> LLM provider strategy** (Groq → Gemini → OpenRouter free, with local Ollama
> for dev) instead of a paid Claude API default, plus local embeddings —
> the entire stack runs at **$0** with no manual intervention needed if any
> single provider's free tier is exhausted mid-use.

## 1. Guiding principles
- Frontend is already built and working — Antigravity must **inspect, preserve, and extend it**, never replace it with a starter template.
- Backend is a separate, independently deployable Python service.
- **LLM boundary (important):** use the LLM for semantic work only — intent, planning, tool selection, explanation, localization. Use APIs/databases for facts, PostGIS for spatial operations, and deterministic Python logic for risk/suitability scoring. **Never let the LLM invent current marine measurements or safety scores.**

## 2. UI Design Tool (already used — historical record)
| Layer | Choice | Why |
|---|---|---|
| UI/UX design | **Google Stitch** | Generated screen designs, exported and built into working Next.js code via **Antigravity**. Frontend complete for Monitor, AI Chat, Alerts, Guide (URL-only), Login, Signup, Profile. |

## 3. Frontend (built — extend, don't replace)
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + React + TypeScript** | Already built. Calls FastAPI instead of implementing business logic itself. |
| Styling | **Tailwind CSS + shadcn/ui** | Already in place. |
| Maps | **MapLibre GL JS** (or Leaflet) + **deck.gl** | Already integrated into Monitor; extend with Tourist layers (beaches/POIs, restricted areas, suitability overlay) in Phase 3. |
| Charts | **Recharts** | Researcher trend widgets. |
| Chat UI | Existing AI Chat screen | Extend to show **real agent progress** (Planner → Weather → Ocean → GIS → Advisory → Suitability → Risk → Recommendation) — never a fake progress animation. |
| State mgmt | **Zustand** / React Query | Map viewport, chat state, caching FastAPI responses. |
| Auth (client) | **Supabase JS client** | Frontend talks to Supabase Auth directly for login/signup/session; JWT attached as Bearer token to FastAPI calls. |
| i18n | **next-intl** | English/Hindi/Marathi/Gujarati/Odia/Tamil already scoped in the UI; backend translation support stages in English→Hindi→Marathi first (Phase 4). |

## 4. Backend — Python FastAPI

```
Next.js (frontend, already built)
   │
   │ HTTPS (Bearer: Supabase JWT)
   ▼
FastAPI (Python)
   │
   ├── Authentication      — verifies Supabase JWT, derives role from profile (never trusts client-sent role)
   ├── API endpoints       — /chat, /map-layers, /alerts, /export, /profile, /activity, etc.
   ├── Agent system        — LangGraph: Planner, Weather, Ocean, GIS, Advisory/RAG, Recommendation
   ├── Data processing     — ingestion/normalization, LIVE/CACHED/DEMO source tracking
   ├── Risk/Suitability engine — deterministic
   └── Database            — Supabase (Postgres + PostGIS + pgvector) via SQLAlchemy/asyncpg
```

| Component | Choice | Why |
|---|---|---|
| Web framework | **FastAPI** | Async-native, automatic OpenAPI docs, strong typing via Pydantic |
| Server | **Uvicorn**, optionally behind **Gunicorn** in production | Standard FastAPI deployment |
| Data validation | **Pydantic v2** | Request/response schemas mirroring the DB schema |
| DB access | **SQLAlchemy 2.0 (async) + GeoAlchemy2**, or `asyncpg` for raw queries | Typed geometry columns matching PostGIS schema |
| Supabase integration | **`supabase-py`** for Auth/Storage calls, SQLAlchemy/asyncpg for direct Postgres/PostGIS queries | Supabase's Python client covers Auth/Storage; direct SQL is cleaner for spatial queries |
| Auth verification | **PyJWT** validating Supabase's JWT as a FastAPI dependency (`Depends(get_current_user)`) | Token issuance stays with Supabase (frontend); enforcement lives in FastAPI |
| Background jobs / scheduling | **APScheduler** (in-process for hackathon simplicity) | Scheduled ingestion of weather/SST/chlorophyll/alerts |
| Data processing | **Pandas, NumPy, xarray, GeoPandas** | Promoted to primary now (not just future-proofing) — needed from Phase 1 for scientific/geospatial normalization into the `observations` table |
| Geospatial (future) | **shapely**, and **netCDF4/rasterio** if raw MOSDAC satellite files are added later | Real NetCDF/raster support if you extend beyond public-data substitutes post-hackathon |

## 5. AI / Multi-Agent Layer — Zero-Cost, Auto-Failover LLM Strategy

> **Zero-cost constraint:** ORCA's multi-agent design means a single chat
> message can trigger 5-6 LLM calls (Planner + up to 4 specialists +
> Recommendation), which burns through tight free-tier request budgets fast.
> The strategy below is layered specifically so no single provider's limit
> can take the demo down, without spending anything.

### 5.1 Provider tiers
| Tier | Provider | Why | Free-tier headroom |
|---|---|---|---|
| **Primary** | **Groq** (Llama 3.3 70B or similar, tool-calling capable) | Fastest inference (LPU hardware), reliable function-calling, generous free daily caps — best fit for a live judged demo | High (thousands of tokens/min class limits, well above OpenRouter's request-count cap) |
| **Secondary** (auto-fallback) | **Google Gemini API** (Gemini 2.0 Flash or similar, tool-calling capable) | Mature tool-calling, ~1,500 requests/day free, different infra than Groq so an outage on one is unlikely to hit both simultaneously | ~1,500 req/day |
| **Tertiary** (auto-fallback) | **OpenRouter free models** (`:free` suffix, or the `openrouter/free` auto-router) | Last-resort backstop only — free tier is **50 requests/day unfunded, 1,000/day after a one-time non-expiring $10 top-up**, capped at **20 requests/minute** either way; free models also rotate out without notice, so pin a specific tested model ID and monitor for delisting | 50-1,000/day (tightest of the three — do not use as primary given 5-6 calls/query) |
| **Offline/dev fallback** (not part of live-demo failover chain) | **Local model via Ollama** (Llama 3.1/3.3 8B, Mistral-Nemo, or another explicitly tool-calling-tuned model) | Zero API calls at all, unlimited, works with no internet — ideal for day-to-day development and golden-query test runs so you never burn hosted free-tier quota while iterating | Unlimited (hardware-bound, not request-bound) |

### 5.2 Automatic failover (not manual env-var switching)
Provider selection must be **runtime, automatic, and transparent to the agent
code** — not something a person has to notice and fix by hand mid-demo:

1. Configure an **ordered provider chain** in FastAPI, e.g.:
   ```
   LLM_PROVIDER_CHAIN=groq,gemini,openrouter
   GROQ_API_KEY=...
   GEMINI_API_KEY=...
   OPENROUTER_API_KEY=...
   OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free   # pin, don't rely on auto-router alone
   OLLAMA_BASE_URL=http://localhost:11434                    # dev-only, not in the live chain
   ```
2. Wrap every LLM call (each agent node) in a **single shared client function** (e.g. `services/api/app/agents/llm_client.py`) that:
   - Tries the first provider in `LLM_PROVIDER_CHAIN`.
   - On a rate-limit response (HTTP 429), a quota-exhausted error, or a timeout, **immediately retries the same request against the next provider in the chain** — no manual intervention, no dropped user message.
   - Logs which provider actually served each request (to `audit_events`, per the Design Doc's audit trail) so you can see after the fact whether/when a fallback fired — useful both for debugging and as a talking point with judges about resilience.
   - Only surfaces an error to the user if **every** provider in the chain fails — and even then, per the project's existing failure strategy (`03_System_Architecture.md` §5), that surfaces as an honest "temporarily unable to reach the reasoning service" message, never a fabricated answer.
3. Because all three hosted providers (Groq, Gemini, OpenRouter) expose an OpenAI-compatible or LangChain-supported interface, this failover wrapper is a thin abstraction — LangGraph's model binding doesn't need to know which provider actually answered.

### 5.3 Other components
| Component | Choice |
|---|---|
| Agent orchestration | **LangGraph (Python)** — fits the Planner → {Weather, Ocean, GIS} → Advisory/RAG → Suitability/Risk → Recommendation graph topology directly |
| Agents | Planner, Weather, Ocean, GIS, Advisory/RAG, Recommendation — see `03_System_Architecture.md` §2 |
| Risk/Suitability Engine | Deterministic Python module — **not** an LLM call, so it's unaffected by any LLM provider's availability |
| RAG embeddings | **Local embeddings via `sentence-transformers`** (e.g. `all-MiniLM-L6-v2`), run inside FastAPI — zero API calls, no rate limits, no dependency on any of the above providers being up |

## 6. Database & Auth
| Layer | Choice | Why |
|---|---|---|
| Database | **Supabase (Postgres + PostGIS)** | See `05_Database_Auth_Evaluation.md` for the full evaluation and v2 schema |
| Auth (issuance) | **Supabase Auth**, called directly from the Next.js frontend | Standard, secure |
| Auth (enforcement) | **FastAPI dependency verifying the Supabase JWT**, deriving role from `profiles` — **never trusting a role sent by the browser** (UI role selection is only a user-facing choice during onboarding, not an authorization signal) | Security rule from the v2 spec, §3.3 of Architecture doc |
| File/dataset storage | **Supabase Storage** via `supabase-py` (service role key, server-only) | Researcher exports, RAG source documents |
| Vector store (RAG) | **pgvector** | `document_chunks.embedding` |

## 7. Evaluation / Testing Layer (new)
| Component | Choice | Purpose |
|---|---|---|
| Backend tests | **pytest** | Auth, role access, tourist profile, chat schema, agent unit tests |
| Agent regression | **Golden query set** (see Design Doc §4.4) | Fixed set of role+activity+query → expected_tools pairs, run after every phase to catch regressions |
| Metrics tracked | Intent/location extraction accuracy, tool selection accuracy, grounded-claim accuracy, risk reproducibility, source attribution, spatial accuracy (targets in PRD §9) | Objective "is this phase actually working" signal, not just vibes |

## 8. External Data Sources
| Data | Source (demo-usable) | Mode tracking |
|---|---|---|
| SST / Chlorophyll | INCOIS PFZ advisories, Bhuvan WMS/GeoJSON, or demo fixture | `data_sources.reliability` + LIVE/CACHED/DEMO label per observation |
| Weather / marine forecast | **Open-Meteo Marine & Weather API** | Same |
| Cyclone/storm tracks | IMD/RSMC public bulletins | Same |
| Coastal admin/protected boundaries, beaches/POIs | Bhuvan/Survey of India open GeoJSON, naturalearthdata.com, or curated demo seed | Same |
| RAG advisory/research documents | Public marine safety guidelines, coastal regulations, tourism advisories | Ingested into `documents`/`document_chunks` |

*(All plain HTTP/JSON/GeoJSON/WMS — fetchable via `httpx` in FastAPI. No NetCDF/raster parsing required for this plan.)*

## 9. DevOps / Hosting
| Layer | Choice |
|---|---|
| Frontend hosting | **Vercel** (unchanged) |
| Backend hosting | **Render or Railway** |
| DB/Auth hosting | **Supabase Cloud** |
| Containerization | **Docker** for the FastAPI service |
| CORS | FastAPI allows the Vercel frontend origin + `localhost` |
| CI | GitHub Actions — separate frontend/backend workflows, backend workflow runs `pytest` + golden-query eval |
| API docs | FastAPI's automatic OpenAPI/Swagger UI (`/docs`) |

## 10. Repo Structure
```
orca/
├─ apps/
│  └─ web/                 # Next.js frontend (already built — preserve as-is)
├─ services/
│  └─ api/                 # FastAPI backend
│     ├─ app/
│     │  ├─ main.py
│     │  ├─ auth/            # JWT verification, role derivation (server-side only)
│     │  ├─ agents/          # planner.py, weather_agent.py, ocean_agent.py,
│     │  │                    gis_agent.py, advisory_rag_agent.py,
│     │  │                    suitability_risk_engine.py, recommendation_agent.py
│     │  ├─ routers/         # chat.py, map_layers.py, alerts.py, export.py, profile.py, activity.py
│     │  ├─ db/              # SQLAlchemy models (v2 schema — see Design Doc §4), session
│     │  ├─ ingestion/       # INCOIS/Bhuvan/Open-Meteo pull + normalize into `observations`
│     │  └─ schemas/         # Pydantic models
│     ├─ tests/              # pytest suite + golden_queries.json
│     ├─ requirements.txt
│     ├─ Dockerfile
│     └─ .env.example
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql               # DEMO seed data, clearly labeled
├─ docs/
│  └─ stitch-exports/
└─ README.md
```

## 11. Why this stack fits going forward
- **FastAPI + LangGraph** gives a real, inspectable multi-agent system matching the PS's "Collaborative Agents" framing, with Python's ecosystem built for exactly this orchestration style.
- **Deterministic Risk/Suitability Engine** keeps the safety-critical judgment auditable and reproducible — a hard requirement for a disaster-management-themed PS, and a metric judges can literally test (100% reproducibility target).
- **Data-source registry + LIVE/CACHED/DEMO labeling** means the demo never has to pretend fallback data is real — it's honest by construction, which reads well to judges and is the right engineering practice regardless.
- **Split frontend/backend** lets you keep developing the agent system and data pipeline independently after the hackathon, without touching the UI.
- **Layered LLM failover (§5.2)** applies the exact same honesty/resilience philosophy as the data-source strategy above, to the model layer itself — the whole system runs at genuine $0 cost with no single point of failure a judge could accidentally trigger by asking one too many questions.
