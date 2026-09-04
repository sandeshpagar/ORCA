# Product Requirements Document (PRD)
## ORCA — Marine EcoSystem Reasoning with Collaborative Agents
**SIH 2026 | PS ID: 26176 | Org: ISRO (Dept. of Space) | Theme: Disaster Management | Category: Software**

> **v2 revision note:** this PRD is now aligned to the "ORCA SIH Detailed Project
> Documentation v2 (Tourist)" spec you provided. Major changes from v1: the role
> set is now `tourist, fisher, authority, researcher, disaster_management, general`
> (was: Fisherman, Researcher, Coastal Authority, Tourist, Maritime Operator —
> **Maritime Operator is dropped**, **Disaster Management and General Marine
> User are added**); Tourist now has an explicit **activity** dimension; and a
> deterministic **Activity Suitability + Risk Engine** sits between data
> retrieval and the LLM's explanation. See `06_Phasewise_Vibecoding_Prompts.md`
> for how this rolls out without breaking the already-built frontend.

## 1. Problem Statement (as given)
ISRO and global agencies generate large daily volumes of satellite Earth Observation and oceanographic data — Sea Surface Temperature (SST), chlorophyll concentration, weather forecasts, etc. Marine stakeholders need timely, synthesized, evidence-based access to this data for operational decisions. The ask is an **intelligent conversational (Agentic AI) platform** that lets users interact naturally with marine data, ask questions, explore scenarios, and get contextual recommendations, using conversational intelligence + geospatial technology.

## 2. Product Vision
ORCA combines weather, ocean, Earth-observation, GIS, advisories and knowledge sources into one shared intelligence core. Multiple user types share this same core, while the experience changes through **role, activity, permissions, and preferences** — not six separate applications, one platform that reshapes itself.

## 3. Goals & Success Metrics
| Goal | Metric |
|---|---|
| Make marine data accessible in natural language | Intent + location extraction ≥90% on curated eval set; tool selection ≥90% |
| Support real-time-ish decision making | Data freshness ≤24h; every response labeled LIVE / CACHED / DEMO — never silently faked |
| Serve multiple stakeholder types with tailored output | All 6 roles served via role-aware planning + one role-aware Monitor screen (see Design Doc §0.1) |
| Trustworthy, auditable safety guidance | Risk reproducibility 100% (deterministic engine); source attribution 100% of live-data responses; no silent fabrication on agent failure |
| Disaster-readiness | Cyclone/high-wave/rough-sea alerts surfaced within the theme (Disaster Management) |
| Demo-readiness for SIH | End-to-end: auth (role + activity) → Monitor (map + role-aware widgets) → chat (visible agent workflow) → alerts |

## 4. User Roles
| Role (canonical value) | Primary objective | Example query |
|---|---|---|
| `tourist` | Safe, enjoyable coastal recreation | "Is this beach suitable tomorrow?" |
| `fisher` | Fishing and operational safety | "Can I go fishing tomorrow?" |
| `authority` | Monitoring and governance (coastal authority) | "Show elevated-risk areas." |
| `researcher` | Evidence and marine analysis | "Find supporting research." |
| `disaster_management` | Hazard awareness/response | "Which areas are affected?" |
| `general` | Understand current conditions (no specific persona) | "What are today's sea conditions?" |

*(Role stored as a constrained DB enum, not free text — see `04_Design_Document.md` §4. Role is set once at first login and **locked** — see §0.1a there — the backend, not the browser, is the authority on a user's role.)*

### 4.1 Tourist persona (detailed — first-class role)
- **Goal:** plan a safe, enjoyable coastal/marine activity with minimal technical knowledge.
- **Activities:** Beach Visit, Boating, Sightseeing, Water Recreation.
- **Needs:** simple language, location-aware recommendations, weather/sea conditions, warnings, activity suitability, nearby map information.
- **Preferences:** language, selected activities, saved locations personalize the experience (`tourist_preferences` table).
- **Safety:** ORCA provides decision support and **must not guarantee safety** — official warnings remain authoritative. Language guideline: say "more suitable based on available conditions," never "safe," and never imply ORCA replaces lifeguards/authorities.

### 4.2 Role-aware recommendation signal weighting (Tourist vs Fisher, illustrative)
| Signal | Tourist | Fisher |
|---|---|---|
| Weather | High | High |
| Waves/sea state | High | High |
| Storm/lightning | Critical | Critical |
| Restricted/protected areas | High | Critical |
| Fishing potential | Low | High |
| Beach/activity suitability | High | Low |
| Nearby attractions/POIs | High | Low |
| RAG/advisories | High | Medium |

This weighting lives in the Recommendation Agent's prompt/logic, not as separate code paths per role — same pipeline, different emphasis.

### 4.3 Tourist journey
```
Tourist signs in
 → selects coastal location
 → chooses activity (Beach Visit / Boating / Sightseeing / Water Recreation)
 → asks a natural-language question
 → Planner identifies role + activity + location + time
 → Weather/Ocean/GIS/Advisory agents retrieve evidence
 → Activity Suitability + Risk Engine evaluates conditions (deterministic)
 → Recommendation Agent explains the result
 → UI shows suitability + factors + map + warnings + sources
```

### 4.4 Tourist requirements (priority-tagged)
| ID | Requirement | Priority |
|---|---|---|
| TR-01 | Tourist role/profile | P0 |
| TR-02 | Activity selection | P0 |
| TR-03 | Location/time-aware query | P0 |
| TR-04 | Weather + sea summary | P0 |
| TR-05 | Activity suitability score | P0 |
| TR-06 | Warnings/advisories | P0 |
| TR-07 | Nearby map/POIs | P1 |
| TR-08 | Forecast/time-window planning | P1 |
| TR-09 | Multilingual guidance | P1 |
| TR-10 | Voice interaction | P2 |

## 5. Core Features (MVP scope)

### 5.1 Multi-Agent Conversational System
- Planner Agent parses role + activity + intent + location + time window.
- Specialist agents (Weather, Ocean, GIS) retrieve evidence, called selectively based on activity (see routing table in `03_System_Architecture.md` §2).
- Advisory/RAG Agent retrieves grounding documents (regulations, safety guidance, tourism advisories) via pgvector.
- **Activity Suitability + Risk Engine** (deterministic Python, not an LLM call) scores conditions.
- Recommendation Agent explains the result in role-appropriate language — it explains, it does not invent measurements or safety scores.

### 5.2 Interactive Geospatial Map
- Layered map: SST heatmap, chlorophyll concentration, wind/wave overlays, cyclone tracks, PFZ zones, alert zones, **and now**: nearby beaches/POIs, restricted/protected area boundaries, activity suitability overlay (Tourist-relevant layers).
- Sensitive Fisher/Authority layers stay behind backend authorization — not just hidden client-side.

### 5.3 Role-Based Experience (Monitor screen)
- One role-aware Monitor screen (see Design Doc §0.1/§2.4) whose widgets adapt by role **and, for Tourist, by selected activity**.

### 5.4 Alerts & Notifications
- Cyclone, high wave, storm surge, rip current alerts, sourced with explicit **LIVE / CACHED / DEMO** labeling (see §8 below) — never presented as live when it isn't.

### 5.5 Data Ingestion Layer with Source Registry
- `data_sources` table tracks each source's reliability and last-updated time.
- `observations` table normalizes readings from any source (SST, chlorophyll, wind, wave, etc.) rather than one table per data type.

### 5.6 Auth & User Management
- Sign up/login via Supabase Auth. Role set once (first-login modal), locked thereafter. Tourist additionally selects activity + language + saved locations (`tourist_preferences`).

### 5.7 Multilingual Support
- UI already built with English, Hindi, Marathi, Gujarati, Odia, Tamil. Backend translation/localization support rolls out English → Hindi → Marathi first (Phase 4), remaining three staged after.

### 5.8 Evaluation Harness
- `pytest` + a golden-query set (see Design Doc §4.4) — intent/location extraction, tool selection, grounded-claim accuracy, risk reproducibility, source attribution, spatial accuracy all have explicit target metrics (§9 below). This is a first-class deliverable, not an afterthought — each phase's Definition of Done in `06_Phasewise_Vibecoding_Prompts.md` references it.

## 6. Non-Functional Requirements
- **Latency:** Chat response < 5s for cached/precomputed data; < 15s for live multi-agent tool calls.
- **Data honesty:** every data-backed claim is labeled LIVE, CACHED, or DEMO — fallback data is never presented as live (see §8).
- **Security:** role is derived server-side from the authenticated user's profile — **never trusted from the browser**. RLS enforced at the DB layer as defense-in-depth.
- **Auditability:** every AI answer traceable to sources + timestamps; `risk_assessments` and `activity_assessments` are auditable records, not ephemeral.
- **Accessibility:** mobile-first, low-bandwidth mode.

## 7. Out of Scope (for hackathon MVP)
- Real satellite data processing pipelines (use public datasets/demo fixtures, clearly labeled).
- Native mobile apps.
- Voice interaction (TR-10, P2 — stretch only if time allows).
- Full multi-agency government SSO integration.

## 8. Data Honesty Strategy (LIVE / CACHED / DEMO)
For every external data pull:
- **External source available →** retrieve, timestamp, cite source, label **LIVE**.
- **Not available →** use a cached/demo fixture *only if explicitly permitted for that context*, label **CACHED** or **DEMO** accordingly.
- **Never** present fallback/demo data as if it were live.
- **Agent failure** → record the error, continue if it's safe to do so with reduced scope, and lower the response's confidence/explain the limitation rather than silently fabricating a result.

## 9. Evaluation Metrics (targets)
| Metric | Target |
|---|---|
| Intent + location extraction | ≥90% on curated set |
| Tool selection accuracy | ≥90% |
| Grounded factual claims | ≥95% for tested factual fields |
| Risk reproducibility | 100% (deterministic engine — same inputs must always give the same score) |
| Source attribution | 100% of live-data responses |
| Spatial test accuracy | 100% on known demo geometries |
| Failure handling | No silent fabrication, ever |
| Tourist UX | Task completion + qualitative clarity (manual judging) |

## 10. Assumptions
- Live ISRO EO data APIs may be gated; prototype uses public equivalents (INCOIS, Bhuvan, Open-Meteo) or clearly labeled demo fixtures, tracked via the `data_sources` registry with honest LIVE/CACHED/DEMO labeling rather than hiding the substitution.
- "Agentic AI" is implemented via LLM tool-calling orchestrated with LangGraph (Python/FastAPI), not a from-scratch ML model.
- Frontend is already built (Stitch → Antigravity); backend work proceeds without altering it structurally.

## 11. Risks
| Risk | Mitigation |
|---|---|
| No access to real ISRO data | Public-data substitutes + explicit LIVE/CACHED/DEMO labeling, never hidden |
| LLM hallucination on marine safety advice | Deterministic Risk/Suitability Engine owns the actual score; LLM only explains it — "Never let the LLM invent current marine measurements or safety scores" |
| Role/data leakage across personas | Role derived server-side only, never trusted from client; RLS + explicit backend authorization on sensitive layers |
| Scope creep across 6 roles + activities | Shared core, role-aware planning — not six separate apps (see Product Vision) |
| Map + real-time data performance | Use vector tiles / clustered GeoJSON, cache layers, precompute heavy layers |

## 12. Demo Script (for judges) — from the v2 SIH Demo Plan
| Time | Segment |
|---|---|
| 0:00–0:45 | Explain the fragmented marine information problem |
| 0:45–1:45 | Login → Tourist → Beach Visit → select coastal location |
| 1:45–3:00 | Ask "Is this a good time to visit tomorrow morning?" — show the actual agent workflow (Planner → Weather/Ocean/GIS → Advisory → Suitability/Risk → Recommendation), not a fake progress animation |
| 3:00–4:00 | Show suitability score, factors, warnings, and sources |
| 4:00–5:00 | Show the Tourist map: nearby places, suitability overlay, restricted/protected areas |
| 5:00–6:00 | Log in as a Fisher/Authority demo account, show the role-aware experience shift |
| 6:00–7:00 | Explain Supabase/PostGIS, LangGraph, the deterministic engine, and the eval harness |

*(Role is locked per account — log in with separate seeded demo accounts per role, don't switch role in-app; see `06_Phasewise_Vibecoding_Prompts.md` Phase 1.)*
