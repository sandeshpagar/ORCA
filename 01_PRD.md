# Product Requirements Document (PRD)
## ORCA — Marine EcoSystem Reasoning with Collaborative Agents
**SIH 2026 | PS ID: 26176 | Org: ISRO (Dept. of Space) | Theme: Disaster Management | Category: Software**

---

## 1. Problem Statement (as given)
ISRO and global agencies generate large daily volumes of satellite Earth Observation and oceanographic data — Sea Surface Temperature (SST), chlorophyll concentration, weather forecasts, etc. Marine stakeholders (fishermen, researchers, coastal authorities, disaster management agencies, maritime operators) need timely, synthesized, evidence-based access to this data for operational decisions. The ask is an **intelligent conversational (Agentic AI) platform** that lets users interact naturally with marine data, ask questions, explore scenarios, and get contextual recommendations, using conversational intelligence + geospatial technology.

## 2. Product Vision
ORCA is a conversational, map-native decision-support platform that turns raw oceanographic/EO data into plain-language, role-aware, actionable guidance — delivered through a chat-first UI backed by an agentic AI system and an interactive geospatial map.

## 3. Goals & Success Metrics
| Goal | Metric |
|---|---|
| Make marine data accessible in natural language | ≥90% of test queries answered with correct data-grounded response |
| Support real-time-ish decision making | Data freshness ≤ 24h for SST/chlorophyll layers |
| Serve multiple stakeholder types with tailored output | All 5 personas served via role-aware output — either separate dashboards (original vision) or a single role-aware Monitor screen (current trimmed build, see Design Doc §0.1) |
| Disaster-readiness | Cyclone/high-wave/rough-sea alerts surfaced within the theme (Disaster Management) |
| Demo-readiness for SIH | End-to-end working prototype: auth (role selection) → Monitor (map + role-aware widgets) → chat → alerts |

## 4. Users / Personas (Fishermen, Researchers, Coastal Authorities + Tourist added)

### 4.1 Fisherman
- **Needs:** Potential Fishing Zones (PFZ), safe-to-sail advisories, weather/wave alerts, nearest safe harbor, fuel-efficient route hints.
- **Key Qs:** "Is it safe to go fishing near Ratnagiri tomorrow?", "Where is the nearest high-chlorophyll zone?"
- **Output style:** Simple language, local language support, map + short verdict + reason.

### 4.2 Researcher / Scientist
- **Needs:** Historical SST/chlorophyll time-series, data export (CSV/NetCDF/GeoJSON), comparison across regions/time, citation-grade evidence.
- **Key Qs:** "Compare SST trend for Arabian Sea Jan–Jun 2026 vs 2025", "Export chlorophyll data for region X."
- **Output style:** Charts, tables, downloadable datasets, methodology/source transparency.

### 4.3 Coastal Authority / Disaster Management Agency
- **Needs:** Real-time alert dashboard, cyclone/storm surge/high-wave monitoring, population-at-risk overlays, broadcast tools, historical incident correlation.
- **Key Qs:** "Which coastal villages are at risk in next 48h?", "Show all active advisories in my jurisdiction."
- **Output style:** Dashboard with severity levels, map heatmaps, exportable situation reports.

### 4.4 Maritime Operator
- **Needs:** Route safety, port conditions, cargo/vessel routing around hazards.

### 4.5 Tourist (added persona)
- **Needs:** Beach/coastal activity safety (swimming, boating, water sports), weather-safe travel windows, nearest safe beaches, simple risk indicators (green/yellow/red), no jargon.
- **Key Qs:** "Is it safe to swim at Goa Calangute beach this weekend?", "Which nearby beaches have calm water today?"
- **Output style:** Very simple language, visual safety badges, no technical oceanographic terms unless asked, tourism-season context, nearest medical/rescue point info.
- **Distinct from Fisherman:** Recreational, short-horizon, safety-first framing rather than livelihood/operational framing; no need for PFZ or route-optimization tools; needs beach amenity/tourism-board info integration.

## 5. Core Features (MVP scope)

### 5.1 Conversational Agentic AI Assistant
- Natural language chat interface (multi-turn, context-aware).
- Agent orchestrates: intent detection → tool/data selection → retrieval → synthesis → response.
- Tool-calling agents for: SST lookup, chlorophyll lookup, weather forecast, alert lookup, route/zone computation.
- RAG layer over static knowledge (safety guidelines, species info, coastal regulations).
- Role-aware response formatting (same question, different persona → different depth/tone).

### 5.2 Interactive Geospatial Map
- Layered map: SST heatmap, chlorophyll concentration, wind/wave overlays, cyclone tracks, PFZ zones, alert zones.
- Click-to-query: click a location → auto-populate chat context.
- Time-slider for historical layers.

### 5.3 Role-Based Dashboards
> **Current build note:** the actual implementation merges this into a single **Monitor** screen with role-aware widgets, rather than separate dashboard routes per persona — see `04_Design_Document.md` §0.1 and §2.4. The description below is the original full vision; still valid as a reference if you later split these into dedicated routes.

- Persona-specific landing dashboard (Fisherman / Researcher / Coastal Authority / Tourist / Maritime Operator).
- Widgets specific to each persona (see 4.1–4.5).

### 5.4 Alerts & Notifications
- Cyclone, high wave, storm surge, rip current alerts.
- Push/email/SMS (stretch) + in-app banner + map overlay.
- Subscribe by region.

### 5.5 Data Ingestion Layer
- Scheduled ingestion from ISRO/INCOIS/IMD-style sources (or mock/sample datasets for prototype since live ISRO feeds may not be accessible during hackathon — see Assumptions).
- Normalization into a common schema (GeoJSON + time series tables).

### 5.6 Auth & User Management
- Sign up/login, role selection, saved locations, query history, notification preferences.

### 5.7 Multilingual Support (stretch, high value for fishermen/tourists)
- English + at least 1–2 regional languages (e.g., Hindi, Marathi/Tamil depending on target coast) for chat responses.

## 6. Non-Functional Requirements
- **Latency:** Chat response < 5s for cached/precomputed data; < 15s for live agent tool calls.
- **Availability:** Prototype target 99% during demo window; design for horizontal scaling later.
- **Scalability:** Architecture must support swapping mock data sources for live ISRO/INCOIS APIs post-hackathon.
- **Security:** Row-level access control per user/role; no PII leakage; signed URLs for exports.
- **Accessibility:** Mobile-first responsive (fishermen/tourists likely on mobile), low-bandwidth mode.
- **Auditability:** Every AI answer should show its data sources/timestamps ("evidence-based").

## 7. Out of Scope (for hackathon MVP)
- Real satellite data processing pipelines (use ISRO Bhuvan/INCOIS sample datasets or mocked realistic data).
- Native mobile apps (web-responsive only).
- Payment/commercial features.
- Full multi-agency government integration/authentication (SSO can be stubbed).

## 8. Assumptions
- Live ISRO EO data APIs may be gated; prototype will use publicly available datasets (INCOIS PFZ advisories, NOAA/Open-Meteo weather, sample SST/chlorophyll NetCDF/GeoJSON) or synthetic data mimicking ISRO's format, clearly labeled as "demo data source" in the README/pitch.
- "Agentic AI" will be implemented via an LLM (Claude/GPT via API) with tool-calling, not a from-scratch ML model, given hackathon time constraints.
- Team will build phase-wise via an AI coding assistant against an initially empty repo.

## 9. Risks
| Risk | Mitigation |
|---|---|
| No access to real ISRO data | Use documented public proxies (INCOIS, Bhuvan open datasets, Open-Meteo Marine API) + clearly note substitution |
| LLM hallucination on marine safety advice | Always ground responses in retrieved data; show source + "not a substitute for official advisories" disclaimer |
| Scope creep across 5 personas | Build shared core first (map + chat + auth), then persona layers incrementally (see phased plan) |
| Map + real-time data performance | Use vector tiles / clustered GeoJSON, cache layers, precompute heavy layers |

## 10. Demo Script (for judges)
1. Login as Fisherman → ask "Is it safe to fish near [coast] tomorrow?" → get PFZ + safety verdict on map.
2. Switch role to Tourist → ask about beach safety → simplified green/yellow/red badge.
3. Switch to Researcher → request SST trend chart + export.
4. Switch to Coastal Authority → view active cyclone/high-wave alert dashboard + at-risk zones.
5. Show alert notification triggering in real time (simulated event).
