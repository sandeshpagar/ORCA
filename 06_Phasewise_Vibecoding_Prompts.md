# Phase-Wise Vibe-Coding Prompt Pack — ORCA (v2, FastAPI + LangGraph)

> **v2 rewrite note:** replaces the earlier 9-phase Next.js-API-routes plan
> with the **4-phase structure** from the "ORCA SIH Detailed Project
> Documentation v2 (Tourist)" spec, adapted to what's already built (frontend
> with Login/Signup/Profile/RoleSelectionModal/RoleWidgetPanel/Monitor/AI
> Chat/Alerts/Guide, currently on mock/localStorage auth). Each phase now
> ends with a **mandatory walkthrough + your explicit confirmation** before
> moving on — this is a hard gate, not a suggestion.

## Global instruction (prepend this to every phase prompt)

```
You are modifying the existing ORCA SIH 2026 repository. The frontend has
ALREADY been created (Next.js + TypeScript, built via Stitch → Antigravity —
Login, Signup, Profile, RoleSelectionModal, RoleWidgetPanel, Monitor, AI
Chat, Alerts, Guide pages all exist).

FIRST inspect the repository: package.json, routes, components, styling,
existing auth/API code (contexts/AuthContext.tsx and related), and
environment handling — before writing anything.

DO NOT replace the frontend with a starter template. Reuse existing
components and design. Make incremental changes only.

After implementation: run tests, lint/type checks, and report every changed
file. Never expose or commit secrets.

At the end of this phase, provide a DETAILED WALKTHROUGH in the same format
as your previous walkthroughs (summary of new files, modified files, features
implemented, verification/test results) and then STOP. Do not begin the next
phase until I explicitly confirm this phase is working correctly.
```

---

## PHASE 1 — Foundation + Auth + Tourist

### Antigravity prompt
```
[Global instruction above, then:]

Implement Phase 1 of ORCA.

1. Preserve and inspect the existing Next.js frontend — do not restructure
   it beyond what's needed below.
2. Add a new FastAPI backend at services/api (Python), per
   docs/02_Tech_Stack.md §4 and §10 (repo structure). Set up:
   - main.py entrypoint, CORS allowing the frontend's origin
   - auth/ — a dependency that verifies the Supabase JWT (PyJWT, using the
     Supabase JWT secret) and derives user_id + role from the `profiles`
     table — NEVER trust a role sent in the request
   - requirements.txt, Dockerfile, .env.example
3. Replace the existing mock/localStorage AuthContext with real Supabase
   Auth: the frontend's Supabase JS client handles login/signup/session
   directly (do not proxy credentials through FastAPI); the resulting JWT
   is attached as a Bearer token on requests to FastAPI.
4. Update the Supabase schema (see docs/04_Design_Document.md §4) to create
   `profiles` with a constrained role enum:
   tourist, fisher, authority, researcher, disaster_management, general.
   NOTE: this replaces the currently-built role list (which includes
   "Maritime Operator") — update the existing RoleSelectionModal.tsx and
   RoleWidgetPanel.tsx components' role options to match this new enum
   instead of rebuilding them from scratch.
5. Add `tourist_preferences` table (activities, travel_style, language) —
   see schema in docs/04_Design_Document.md §4.
6. Wire the existing RoleSelectionModal to write the chosen role to
   `profiles.role` via a FastAPI endpoint (or directly via Supabase from the
   frontend, your call) on first login only — role remains LOCKED afterward,
   no way to change it via any UI (this is already true of the current mock
   implementation; just carry it through to the real backend).
7. Add Tourist onboarding: when role = tourist, after role selection, show
   an activity picker — Beach Visit / Boating / Sightseeing / Water
   Recreation (multi-select, stored in tourist_preferences.activities) —
   plus confirm language preference and location (reuse the existing
   Profile page's language selector and home-region field for this, don't
   build a new onboarding wizard).
8. Connect the existing AI Chat screen to a new FastAPI `/chat` endpoint
   that, for now, just calls a normalized weather/ocean data adapter
   (plain HTTP fetch to Open-Meteo — full multi-agent system comes in Phase
   2). No fake data presented as real: label every response's data source
   and mark it LIVE, CACHED, or DEMO explicitly (see docs/01_PRD.md §8).
9. Add a `data_sources` table and tag every external data pull's mode
   (live/cached/demo) — see docs/04_Design_Document.md §4.
10. Add pytest tests in services/api/tests/ covering: JWT verification,
    role-derivation-not-trusting-client, tourist_preferences CRUD, and the
    /chat endpoint's request/response schema.

Do not invent marine measurements — if the Open-Meteo call fails, return an
explicit error/limitation, never a fabricated number.
```

### Definition of Done (from v2 spec, verify every item before confirming)
- [ ] Login/signup works via real Supabase Auth (not mock/localStorage).
- [ ] Tourist is stored as a real, constrained-enum role in `profiles`.
- [ ] Tourist activities can be selected and persist in `tourist_preferences`.
- [ ] FastAPI backend receives a **trusted, server-derived** user + role on every request — verify by attempting to pass a different `role` in a request body and confirming it's ignored.
- [ ] Existing frontend (Monitor/AI Chat/Alerts/Guide/Profile) remains fully functional — no visual or navigation regressions.
- [ ] No secrets committed or exposed to the browser (check `.env.example` vs actual `.env`, check browser devtools network tab for leaked service-role keys).
- [ ] Demo fallback (LIVE/CACHED/DEMO labeling) works when Open-Meteo is unreachable.
- [ ] `pytest` suite passes.

### How to evaluate before confirming
1. Sign up as a new user → confirm role-selection modal appears once, pick "Tourist," confirm activity picker appears, select 2+ activities, confirm they persist after logout/login.
2. Try to change role anywhere in the UI — confirm there is no way to do so.
3. Open browser devtools, inspect a `/chat` request — confirm no service-role key or JWT secret appears anywhere in frontend-sent data.
4. Kill network access to Open-Meteo (or point the env var at a bad URL) and confirm the chat response says data is unavailable rather than inventing numbers.
5. Run `pytest` in `services/api` — all tests green.

**Only after all of the above are confirmed working, move to Phase 2.**

---

## PHASE 2 — Multi-Agent + Role-Aware Planning

### Antigravity prompt
```
[Global instruction above, then:]

Implement Phase 2 using LangGraph, without rewriting Phase 1.

Graph state must include exactly these keys (see docs/03_System_Architecture.md
§2.1): user_id, role, language, activity, user_query, location, time_window,
intent, weather_result, ocean_result, gis_result, advisory_result,
risk_result, activity_suitability, sources, errors, final_response.

Build these shared LangGraph nodes (one graph, not one per role):
planner, weather, ocean, gis, advisory_rag, risk_and_suitability
(deterministic Python, NOT an LLM call), recommendation.

Implement activity-based routing in the planner node — for Tourist:
  beach_visit      → weather + ocean + advisory + gis
  boating          → weather + ocean + advisory + gis
  sightseeing      → weather + gis + advisory   (skip ocean)
  water_recreation → weather + ocean + advisory + gis
Apply an equivalent (simpler) routing table for the other 5 roles based on
what data each role's typical queries need — do not call every specialist
for every query.

Risk_and_suitability must be pure deterministic Python (threshold rules on
wind/wave/storm proximity/restricted-area distance) — never an LLM call. The
LLM (recommendation node) may explain the result but must never invent
measurements or compute the safety score itself.

Wire the /chat endpoint from Phase 1 to run this graph instead of the
simple Open-Meteo passthrough. Persist the full trace (which nodes ran,
their outputs, errors) to `messages`/`audit_events` per
docs/04_Design_Document.md §4.

Add pytest tests using the golden query set in docs/04_Design_Document.md
§4.3 — assert expected_tools were actually invoked for each query.
```

### PHASE 2B — Tourist UI (agent progress visibility)
```
[Global instruction above, then:]

Extend the existing AI Chat screen to show REAL agent progress for Tourist
(and other role) queries — reuse current components/styles, do not redesign.

Show, as each node actually completes (not a fake animation):
Planner → Weather → Ocean → GIS → Advisory → Activity Suitability → Risk →
Recommendation

Final Tourist answer format:
1. Suitability (score + LOW/MODERATE/HIGH/UNSUITABLE)
2. Best time/window, if supported by the data
3. Key reasons
4. Warnings
5. Sources (with retrieval time, and LIVE/CACHED/DEMO label)

This must reflect the graph's actual execution state, not a hardcoded
sequence — if a node is skipped (e.g. Ocean for sightseeing), don't show it
as having run.
```

### Definition of Done
- [ ] LangGraph state object matches the schema exactly (all 16 keys present).
- [ ] Activity-based routing works — verify sightseeing skips the Ocean agent (check logs/audit_events, not just the final answer).
- [ ] Risk/suitability score is reproducible: same inputs → same score, every time (run the same query twice, compare `risk_assessments`/`activity_assessments` rows).
- [ ] Recommendation Agent's output never contains a number that didn't come from `weather_result`/`ocean_result`/`gis_result` — spot-check 3 responses against the raw tool outputs.
- [ ] Chat UI shows real, non-faked agent progress that matches which nodes actually ran.
- [ ] Golden query eval (docs/04_Design_Document.md §4.3) passes — expected_tools match actual tools invoked for all 4 sample queries (and equivalents for other roles, if added).
- [ ] `pytest` suite passes, including the new golden-query tests.

### How to evaluate before confirming
1. Run each of the 4 golden queries manually as a Tourist demo account, confirm the tool-invocation trace matches `expected_tools`.
2. Ask "Why is boating unsuitable?" and confirm the answer cites the deterministic factors, not a freshly-invented explanation.
3. Run the same suitability-affecting query twice within a short window and confirm the score is identical (reproducibility).
4. Check `audit_events`/`messages` for a full trace of one conversation — confirm it's inspectable, not a black box.

**Only after all of the above are confirmed working, move to Phase 3.**

---

## PHASE 3 — PostGIS + Tourist Maps + Explainable Suitability

### Antigravity prompt
```
[Global instruction above, then:]

Implement Phase 3 GIS work.

Populate `map_features` (docs/04_Design_Document.md §4) with clearly-labeled
DEMO seed data for:
- beaches / coastal POIs
- protected areas
- restricted areas
- activity/tourism zones
- risk geometries (e.g. current alert-worthy zones)

Implement in the GIS agent / FastAPI layer:
1. Nearby beaches/POIs query (ST_DWithin)
2. Distance to restricted/protected areas (ST_Distance)
3. Point-in-polygon checks (ST_Contains/ST_Within)
4. Viewport/bounding-box map queries (ST_Intersects against a bbox) for the
   Monitor screen's map
5. "More suitable nearby locations" — rank nearby features by the same
   deterministic suitability logic from Phase 2

Build the deterministic Activity Suitability Engine as its own testable
Python module (services/api/app/agents/suitability_risk_engine.py) with
factors: wind, wave height, storm/lightning, official advisory,
restricted/protected status, visibility/rain where relevant. Return:
suitability = LOW/MODERATE/HIGH/UNSUITABLE, plus score, factors array, a
plain-language explanation, and source metadata for each factor.

Never label anything "absolutely safe" anywhere in the output.
```

### PHASE 3B — Role-aware map
```
[Global instruction above, then:]

Extend the EXISTING Monitor screen's map (do not rebuild it) with Tourist
layers:
- nearby attractions/beaches/coastal points
- activity suitability overlay
- warnings
- restricted/protected areas
- risk zones

Keep sensitive Fisher/Authority layers behind backend authorization — the
FastAPI endpoint serving map-layers must check role server-side and omit
restricted layers from the response entirely for unauthorized roles (not
just hide them client-side with CSS).

Add proper loading and error states for map data fetches. Use viewport
(bbox) queries so the map doesn't load the whole country's features at once.
```

### Definition of Done
- [ ] All 5 map-feature categories seeded and visibly rendering on the Monitor map, clearly labeled as demo data (per docs/01_PRD.md §8 data-honesty rule).
- [ ] Nearby-beaches, distance-to-restricted-area, point-in-polygon, and bbox queries all return correct results against known demo geometries (100% spatial-test accuracy target — docs/01_PRD.md §9).
- [ ] Activity Suitability Engine is a standalone, unit-testable module with its own pytest tests — not embedded inline in the agent code.
- [ ] Suitability output never says "safe" or "absolutely safe" anywhere — grep the codebase/output strings to confirm.
- [ ] A non-authorized role's map-layers request genuinely does not receive restricted-layer data in the response payload (verify via a direct API call, not just the UI).
- [ ] Map loading/error states work when a query is slow or fails.

### How to evaluate before confirming
1. Log in as Tourist, confirm the map shows beaches/POIs/suitability/warnings/restricted areas.
2. Log in as a role without map-layer authorization for a sensitive layer, call the `/map-layers` endpoint directly (e.g. via curl/Postman) and confirm the restricted layer is absent from the raw response, not just hidden in the UI.
3. Pan/zoom the map and confirm it's querying by viewport, not loading everything at once (check network tab payload sizes).
4. Run the spatial pytest suite — 100% pass on known demo geometries.

**Only after all of the above are confirmed working, move to Phase 4.**

---

## PHASE 4 — RAG + Satellite/EO + Multilingual + Voice

### Antigravity prompt
```
[Global instruction above, then:]

Implement Phase 4 incrementally — treat each of the four sub-areas below as
independently completable, don't block one on another.

RAG:
- Ingest marine advisories, coastal/tourism guidance, and research/reference
  documents into `documents`/`document_chunks` (docs/04_Design_Document.md §4)
- Chunk → embed (Anthropic/OpenAI/Voyage embeddings) → store in pgvector
- Wire the Advisory/RAG Agent (from Phase 2) to retrieve relevant chunks and
  display the source document title in the final answer

Earth observation:
- Build a normalized adapter (in services/api/app/ingestion/) for useful
  marine variables from INCOIS/Bhuvan/Open-Meteo
- Preserve source, timestamp, and spatial coverage on every ingested
  observation (writes into `observations` + `data_sources`, per the
  LIVE/CACHED/DEMO rule)
- Support a public/open dataset OR a demo fixture — label honestly either way

Multilingual:
- Wire actual backend translation/localization for English, Hindi, Marathi
  first (the frontend's Profile page already lists all 6 languages — Gujarati/
  Odia/Tamil UI stays as-is, just not yet backend-translated)
- Preserve units, numbers, warnings, and risk labels correctly across
  languages — do not translate a risk LEVEL enum value, only its display label

Voice (optional, P2 — only if time allows):
- Local/open speech-to-text feeding into the existing ORCA chat, then
  text-to-speech on the response
- Do NOT create a second reasoning pipeline for voice — it must go through
  the same /chat endpoint and graph as text queries
```

### PHASE 4B — Tourist planning mode
```
[Global instruction above, then:]

Add a Tourist trip/activity planning mode, extending existing components.

Inputs: destination/coastal location, date/time or range, activity, optional
preferences (from tourist_preferences).

Outputs:
- suitability by time window (e.g. across a 3-day range, not just "now")
- weather/sea summary
- important warnings
- nearby relevant map features
- evidence/sources
- an explicit caveat that conditions can change

Do not invent tourist attractions or safety facts — use verified data or
data explicitly labeled DEMO.
```

### Definition of Done
- [ ] RAG retrieval returns relevant chunks with source titles shown in the final answer — spot-check 5 queries against the ingested document set.
- [ ] Grounded factual claims meet the ≥95% target on a manual review sample (docs/01_PRD.md §9).
- [ ] Source attribution appears on 100% of live-data responses.
- [ ] English/Hindi/Marathi responses are correct and don't mistranslate risk-level enum values or numeric units.
- [ ] Tourist planning mode returns a time-windowed suitability view, not just a single "now" answer.
- [ ] (If voice attempted) voice queries produce identical reasoning to the equivalent typed query — same graph, same endpoint.
- [ ] Full `pytest` suite + golden query eval still passes after all Phase 4 changes (no regressions from Phases 1–3).

### How to evaluate before confirming
1. Ask a query that should hit the knowledge base (e.g. a regulation question) and confirm the answer cites a real ingested document, not a hallucinated one.
2. Switch the Profile language to Hindi/Marathi and re-ask a suitability question — confirm the risk level concept is preserved correctly, just the label is translated.
3. Use Tourist planning mode for a 3-day range and confirm it returns suitability per day/window, not one static answer.
4. Re-run the full golden query eval from Phase 2 — confirm no regression.

**Only after all of the above are confirmed working, the app is feature-complete per this plan.**

---

## Final Pre-Demo Checklist (from v2 spec §7.1)
- [ ] Tourist role exists in database as a constrained enum value.
- [ ] Tourist onboarding/profile (role + activity + language + location) works.
- [ ] Backend derives role from auth on every request — verified, not assumed.
- [ ] Planner uses role + activity + intent to route correctly.
- [ ] Tourist recommendation signal priorities work as specified (docs/01_PRD.md §4.2).
- [ ] Tourist map layers work, restricted layers properly gated server-side.
- [ ] Activity Suitability Engine is deterministic and reproducible.
- [ ] Warnings/sources are visible wherever data is shown.
- [ ] A Tourist account cannot access Authority/Disaster-Management-only data — verify directly via API calls, not just UI.
- [ ] RLS policies tested (attempt cross-user reads, confirm denial).
- [ ] Golden evals include Tourist cases and pass.
- [ ] Demo fixtures allow a full Tourist flow without any paid API being reachable (offline-safe demo).
- [ ] Existing frontend is fully preserved and functional throughout.

## SIH Demo Plan (see full script in `01_PRD.md` §12)
0:00–0:45 problem framing → 0:45–1:45 Tourist login/activity/location →
1:45–3:00 live agent workflow on a real query → 3:00–4:00 suitability/
factors/sources → 4:00–5:00 Tourist map → 5:00–6:00 switch to a Fisher/
Authority demo account → 6:00–7:00 explain Supabase/PostGIS/LangGraph/
deterministic engine/evals.
