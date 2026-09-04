# Tech Stack Document — ORCA

> **v2 revision note:** aligned to the "ORCA SIH Detailed Project Documentation
> v2 (Tourist)" spec. Core stack confirmed: **Next.js + TypeScript (frontend,
> already built) • FastAPI + Python (backend) • LangGraph (agents) • Supabase
> (Postgres + PostGIS + pgvector + Auth + Storage) • MapLibre/Leaflet •
> deterministic Risk/Suitability Engine.** New in this revision: scientific
> processing libs promoted to primary (not just future-proofing), an explicit
> evals layer, and a documented LLM-boundary principle.

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

## 5. AI / Multi-Agent Layer
| Component | Choice |
|---|---|
| LLM | **Claude API (Anthropic Python SDK)** by default — simplest, no infra to manage, best quality for a judged demo. *Optional:* a local/open model (e.g. via Ollama) can be swapped in for cost-free early development, since LangGraph's tool-calling pattern is largely model-agnostic — not required unless you want to avoid API costs during heavy iteration. |
| Agent orchestration | **LangGraph (Python)** — fits the Planner → {Weather, Ocean, GIS} → Advisory/RAG → Suitability/Risk → Recommendation graph topology directly |
| Agents | Planner, Weather, Ocean, GIS, Advisory/RAG, Recommendation — see `03_System_Architecture.md` §2 |
| Risk/Suitability Engine | Deterministic Python module — **not** an LLM call |
| RAG embeddings | Anthropic/OpenAI/Voyage embeddings (Python SDKs) → `pgvector` |

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
