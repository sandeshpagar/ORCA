# Tech Stack Document — ORCA

## 1. Guiding principles
- Fast to vibe-code phase-wise (popular, well-documented, AI-tool-friendly stack).
- Single repo, deployable as a web app (SIH judging = live demo/URL).
- Free-tier friendly for hackathon (Supabase, Vercel, map tile providers).

## 2. UI Design Tool (new — precedes frontend build)
| Layer | Choice | Why |
|---|---|---|
| UI/UX design | **Google Stitch** (stitch.withgoogle.com) | AI-generated screen designs from text prompts; exports as images and/or HTML/CSS and can push to Figma. Used to design every screen *before* code generation, so the vibe-coding tool has a concrete visual target instead of improvising layout/spacing each phase. |

**Workflow implication:** design and code are now two explicit passes —
1. **Design pass (Stitch):** generate & refine each screen (onboarding, dashboards, chat, map, alerts) as a Stitch project; export screens as PNG/JPG (and HTML/CSS if Stitch's export is usable) into `docs/stitch-exports/`.
2. **Build pass (vibe-coding tool):** each phase prompt now includes "replicate the attached/referenced Stitch design for screen X" instead of asking the AI to invent layout — it only needs to translate Stitch's HTML/CSS or image into working Next.js + Tailwind/shadcn components and wire in real data/logic.

This keeps visual design consistent and judge-facing polish high, while letting the coding tool focus purely on functionality.

## 3. Frontend
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + React + TypeScript** | SSR for fast first load, API routes for backend-for-frontend, huge AI-tool training coverage → best vibe-coding results |
| Styling | **Tailwind CSS + shadcn/ui** | Rapid, consistent, accessible components; easy for AI tools to generate |
| Maps | **MapLibre GL JS** (or Leaflet if simpler) + **deck.gl** for heatmap/GeoJSON overlays | Open-source, no vendor lock, supports raster (SST tiles) + vector (zones, alerts) layers |
| Charts | **Recharts** | Simple time-series/trend charts for Researcher persona |
| Chat UI | Custom React chat component (streaming via SSE/fetch) | Full control over role-aware rendering (cards, maps-in-chat, source citations) |
| State mgmt | **Zustand** (or React Query for server state) | Lightweight, avoids Redux boilerplate |
| i18n | **next-intl** | Multilingual support for fishermen/tourists |
| PWA | `next-pwa` (stretch) | Offline/low-bandwidth support for field users |

## 4. Backend / API
| Layer | Choice | Why |
|---|---|---|
| App server | **Next.js API Routes / Route Handlers** (or a separate **Node.js/Express** service if agent logic gets heavy) | Same repo, simple deploy; split out later if needed |
| Agentic AI orchestration | **Anthropic Claude API (tool use) or LangChain/LangGraph** (Node or Python microservice) | Tool-calling agent pattern: intent → tool selection → data fetch → synth |
| Background jobs / ingestion | **Supabase Edge Functions** (Deno) or a small **Python (FastAPI + APScheduler/Celery)** ingestion service | Scheduled pulls of SST/chlorophyll/weather data, normalize → DB |
| Realtime alerts | **Supabase Realtime** (Postgres changes → websocket) | Push new alerts to connected clients instantly |

> If the agent logic needs Python-native geospatial/data libs (xarray, netCDF4, rasterio) for parsing ISRO/INCOIS datasets, run a **separate lightweight Python microservice (FastAPI)** just for data ingestion/processing, called by the Next.js backend — keeps the AI orchestration and web layers simple while giving you real geospatial tooling.

## 5. Database & Auth
| Layer | Choice | Why |
|---|---|---|
| Database | **Supabase (Postgres + PostGIS)** | See full evaluation in doc `05_Database_Auth_Evaluation.md` — recommended |
| Auth | **Supabase Auth** | Email/password + OAuth (Google) + role-based metadata, RLS integration |
| File/dataset storage | **Supabase Storage** | Store exported CSV/GeoJSON, cached raster tiles |
| Vector store (for RAG) | **pgvector (Supabase extension)** | Keep RAG in the same Postgres instance, no extra vendor |

## 6. AI / ML Layer
| Component | Choice |
|---|---|
| LLM | Claude (Anthropic API) or GPT-4-class model, via tool-calling/function-calling |
| RAG embeddings | OpenAI/Anthropic/Voyage embeddings → stored in `pgvector` |
| Agent framework | LangChain.js / LangGraph.js (TS, matches Next.js) — or plain function-calling loop if simpler |
| Geospatial reasoning tools | Custom "tools" exposed to the agent: `get_sst(lat,lon,date)`, `get_chlorophyll(...)`, `get_weather(...)`, `get_active_alerts(region)`, `get_pfz(region)` |

## 7. External Data Sources (prototype-realistic substitutes for ISRO feeds)
| Data | Source (demo-usable) |
|---|---|
| SST / Chlorophyll | INCOIS PFZ advisories (public), Bhuvan open data, NOAA CoastWatch (if accessible), or synthetic GeoJSON grid for demo |
| Weather / marine forecast | **Open-Meteo Marine & Weather API** (free, no key needed) |
| Cyclone/storm tracks | IMD/RSMC public bulletins (manual/periodic ingestion for demo) |
| Coastal admin boundaries | Bhuvan/Survey of India open GeoJSON, or naturalearthdata.com |

*(Document clearly in your submission that ISRO's live data pipeline is simulated using public equivalents due to hackathon-time API access constraints — judges expect this and it's fine to state explicitly.)*

## 8. DevOps / Hosting
| Layer | Choice |
|---|---|
| Hosting (frontend+API) | **Vercel** (free tier, Next.js native) |
| DB/Auth hosting | **Supabase Cloud** (free tier) |
| Python microservice (if used) | **Render/Railway** free tier |
| CI | GitHub Actions (lint/build check on push) |
| Monitoring | Vercel Analytics + Supabase logs (sufficient for hackathon) |

## 9. Repo Structure (single repo, monorepo-lite)
> **Note:** this is a reference target, written before Antigravity generated the
> actual project from the Stitch export. Antigravity's generated structure may
> differ (e.g. no `apps/` monorepo split) — that's fine; reconcile against this
> only if you need to add pieces (ingestion service, agent-tools package) that
> weren't part of the frontend generation.
```
orca/
├─ apps/
│  └─ web/                # Next.js app (frontend + API routes)
├─ services/
│  └─ ingestion/           # optional Python FastAPI microservice
├─ packages/
│  ├─ ui/                  # shared shadcn/ui components
│  └─ agent-tools/         # tool definitions for the AI agent
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
├─ docs/                   # this document set
│  └─ stitch-exports/       # exported Stitch screen designs (images/HTML) — build reference
└─ README.md
```

## 10. Why this stack fits "vibe coding" phase-wise
- Next.js + Tailwind + shadcn + Supabase is one of the **most-represented stacks** in AI coding tool training data → fewer hallucinated APIs, higher first-try success.
- Clear folder boundaries let you prompt phase-by-phase (auth phase touches `apps/web/app/(auth)`, map phase touches `apps/web/app/(map)`, etc.) without cross-contamination.
- Supabase gives you DB + Auth + Realtime + Storage + Vector in one dashboard — minimizes the number of services an AI tool needs to wire together correctly.
