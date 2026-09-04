# Database & Auth Evaluation — ORCA

> **v2 revision note:** schema references updated to the normalized v2 design
> (`observations`, `data_sources`, `map_features`, `risk_assessments`,
> `activity_assessments`, `documents`/`document_chunks`, `feedback`,
> `audit_events`) and the 6-role enum. The Supabase-vs-alternatives
> evaluation and recommendation below are unchanged — this pivot doesn't
> affect the database choice, only what's built on top of it.

## 1. Requirements Recap
ORCA needs to store/query:
1. **Geospatial data** — points (SST/chlorophyll readings), polygons (PFZ zones, alert areas), with radius/bbox/time-range queries.
2. **Time-series** — daily/hourly readings, trend queries over date ranges.
3. **Vector embeddings** — for RAG (safety guidelines, regulations knowledge base).
4. **Relational/user data** — profiles (role, locked once set), tourist_preferences, conversations/messages, locations, feedback, audit_events.
5. **Realtime push** — new risk/alert conditions should reach connected clients without polling.
6. **Auth** — email/OAuth login, **server-derived** role-based access (never trusting a client-sent role), row-level security per user.
7. **File storage** — exported datasets (CSV/GeoJSON) for Researcher role, RAG source documents.
8. **Fast hackathon setup, but built to continue post-hackathon** — small team now, but this needs to remain maintainable as a real service.

## 2. Supabase Evaluation

### 2.1 What Supabase gives you out of the box
| Need | Supabase capability | Fit |
|---|---|---|
| Geospatial | **Postgres + PostGIS extension** (one click enable) — full `geography`/`geometry` types, `ST_DWithin`, `ST_Contains`, spatial indexes | ✅ Excellent — this is the single biggest reason Supabase fits ORCA |
| Time-series | Native Postgres with btree/time indexes; can add TimescaleDB-style patterns manually, or just index `recorded_at` | ✅ Good enough at hackathon/prototype scale |
| Vector/RAG | **pgvector extension** built in | ✅ Excellent — no separate vector DB needed |
| Relational data | Standard Postgres | ✅ Excellent |
| Realtime | **Supabase Realtime** (listens to Postgres WAL, pushes changes over websockets) | ✅ Very good — perfect for the alerts pipeline |
| Auth | **Supabase Auth** — email/password, magic link, OAuth (Google etc.), JWT issuance, integrates directly with RLS via `auth.uid()` | ✅ Excellent — saves you building auth from scratch |
| Row-level security | Native Postgres RLS, first-class in Supabase | ✅ Excellent — critical for "user only sees own saved locations/chat" |
| File storage | **Supabase Storage** (S3-compatible), signed URLs | ✅ Good — sufficient for CSV/GeoJSON exports |
| Edge functions | **Supabase Edge Functions** (Deno) for scheduled ingestion/alert rules | ✅ Good, though heavier geospatial parsing (NetCDF etc.) is better in a Python microservice |
| Free tier | Generous free tier (500MB DB, 1GB storage, 50k MAU auth) | ✅ Sufficient for hackathon/demo |
| AI-tool familiarity | Extremely well represented in vibe-coding tool training data (Lovable, Bolt, Cursor, etc. default to it) | ✅ High first-try success rate for prompted code |

### 2.2 Limitations / things to watch
- **NetCDF/raster EO data:** PostGIS handles vector geometry well but is not a raster/NetCDF engine. If you later ingest real ISRO NetCDF EO files, you'll pre-process them (Python/xarray) into point/grid rows or GeoTIFF tiles *before* loading into Supabase — Supabase itself won't parse NetCDF.
- **Heavy time-series at scale:** for very large multi-year hourly datasets, plain Postgres indexing is fine at hackathon scale but would benefit from TimescaleDB (not natively bundled in Supabase, though you *can* self-manage a Timescale instance separately if you outgrow this — not needed for MVP).
- **Vector search scale:** pgvector is great up to hundreds of thousands of embeddings; your RAG knowledge base (safety docs, regulations) is small, so this is a non-issue here.
- **Cold starts / rate limits on free tier:** fine for a hackathon demo; would need a paid plan for production/government deployment.

### 2.3 Alternatives Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Firebase (Firestore + Auth)** | Very fast to set up, great realtime | No native geospatial query engine (geo-queries are hacky via geohash libs), no SQL/PostGIS, no pgvector — would need a separate vector DB for RAG | ❌ Weaker fit — geospatial is core to this PS |
| **MongoDB Atlas** | Has `$geoNear`/geospatial indexes, flexible schema | Weaker relational integrity for role/RLS-style access control, need separate auth (Clerk/Auth0) and separate vector store (Atlas Vector Search exists but adds complexity), less AI-tool-familiar for this exact combo | 🟡 Workable but more moving parts |
| **Plain self-hosted Postgres + PostGIS (e.g., on Railway/Neon) + Clerk/Auth0 for auth** | Same DB power as Supabase | You rebuild what Supabase already bundles (auth+RLS+realtime+storage) — more integration work in limited hackathon time | 🟡 More control, less speed |
| **Neon (serverless Postgres) + Auth.js** | Great DX, serverless scaling, has PostGIS | No built-in Realtime/Storage — you'd bolt on Pusher/Ably + S3 separately | 🟡 More assembly required |
| **Supabase** | PostGIS + pgvector + Auth + RLS + Realtime + Storage in one project, best AI-tool support | Not built for raster/NetCDF ingestion (needs a small pre-processing step), free-tier limits | ✅ **Best overall fit for this PS and timeline** |

### 2.4 Recommendation
**Use Supabase.** The PS explicitly needs geospatial querying (SST/chlorophyll/zones), a conversational RAG layer, per-user personalization with access control, and real-time alerts — Supabase is the only option in this comparison that natively covers *all four* (PostGIS + pgvector + Auth/RLS + Realtime) in a single managed service, which matters a lot given a hackathon's limited engineering time. The one gap (raw NetCDF/raster EO parsing) is not a database problem — it's solved with a small Python pre-processing step before data ever reaches the DB, regardless of which database you choose.

## 3. Auth Design with Supabase
- **Methods:** Email/password + Google OAuth (fast login for demo).
- **Role assignment:** `profiles.role` (constrained enum: `tourist, fisher, authority, researcher, disaster_management, general`) set once via a role-selection modal on first login, then **locked** — no in-app way to change it afterward. **FastAPI is the enforcement point:** it derives role server-side from `profiles` on every request and never trusts a role sent by the client (see `03_System_Architecture.md` §4). For demos, use separate seeded accounts per role (see `06_Phasewise_Vibecoding_Prompts.md` Phase 1).
- **RLS pattern:** `auth.uid() = user_id` on all personal tables (`tourist_preferences`, `conversations`, `messages`, `locations`); public-read on `map_features`; `risk_assessments`/`activity_assessments`/`audit_events` have no client write policy at all — only FastAPI's service role can insert them.
- **Session handling:** Supabase JS client manages JWT refresh in the Next.js frontend via `@supabase/ssr`; the resulting JWT is sent as a Bearer token to FastAPI on every request.
- **Role-in-JWT (optional optimization, still safe under the "never trust client role" rule):** a Postgres trigger can copy `role` into the JWT's custom claims on login. This remains safe because the JWT is cryptographically signed by Supabase — a client can't forge or edit it — unlike a `role` field submitted in a request body, which FastAPI must never read as authoritative.

## 4. Setup Checklist
1. Create Supabase project.
2. Enable extensions: `postgis`, `vector`.
3. Run schema migration (see `04_Design_Document.md` §4 — v2 normalized schema).
4. Configure Auth providers (email + Google).
5. Set up RLS policies (§4.2 in Design Doc).
6. Generate SQLAlchemy models / Pydantic schemas in the FastAPI service matching the schema (mirrors what `supabase gen types typescript` would do for a TS backend — here it's Python-side).
7. Store `SUPABASE_URL`, `SUPABASE_ANON_KEY` in the **frontend's** env (`NEXT_PUBLIC_*`); store `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` in the **FastAPI backend's** env only — the service role key and JWT secret must never reach the browser.
