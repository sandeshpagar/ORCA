# Design Document — ORCA

> **v2 revision note:** aligned to the "ORCA SIH Detailed Project Documentation
> v2 (Tourist)" spec. Role set is now `tourist, fisher, authority, researcher,
> disaster_management, general` (was 5 personas incl. Maritime Operator — see
> `01_PRD.md` for the full reconciliation note). DB schema (§4) is fully
> replaced with the v2 normalized/auditable schema. New Tourist-specific UI
> components (activity selector, suitability card, why panel) are added in §2.6.

## 0. Design Workflow: Google Stitch → Vibe-Coded UI

### 0.1 Current build scope (read this first)
The sections below describe the **original vision** (persona dashboards,
separate landing/login/onboarding screens). The **actual build in progress**
uses a trimmed 4-screen structure, generated in Stitch and exported to
Antigravity:

| Actual screen | Replaces / merges | Notes |
|---|---|---|
| **Style Guide** | — | Internal design-token reference, not a shipped app screen |
| **Monitor** | Map view + all persona dashboards | One screen; widgets/content shown are **role-aware and, for Tourist, activity-aware** — see §2.4 below |
| **AI Chat** | Chat interface | Extend to show real agent progress (v2 Phase 2B) |
| **Alerts** | Alerts center | As originally designed |
| *(built)* | Landing / Login / Onboarding / role selection | **Built via Antigravity, not Stitch** (functional-first plain forms). Login, Signup, Profile pages exist. Role is set **once** via a first-login modal and **locked afterward** — no header switcher (see §0.1a). |

**Role set update (v2):** the RoleSelectionModal and RoleWidgetPanel currently
built list 5 roles including **Maritime Operator**. The v2 spec's canonical
role enum is `tourist, fisher, authority, researcher, disaster_management,
general` — **Maritime Operator is dropped**, **Disaster Management** and
**General** are added. This requires an edit (not a rebuild) to the existing
RoleSelectionModal/RoleWidgetPanel component — see `06_Phasewise_Vibecoding_Prompts.md`
Phase 1.

### 0.1a Role-lock decision + v2 security rule
Role is set once at first login and **cannot be changed through any in-app UI
afterward** (no header dropdown, no editable field on Profile — role shows
there as a read-only badge). The v2 spec formalizes *why* this matters beyond
UX: **the backend must never trust a role sent by the browser** — role is
always derived server-side from `profiles` (see `03_System_Architecture.md`
§4). The frontend's role display/selection is a convenience, never an
authorization signal.

**Demo implication:** to show judges all 6 roles, seed 6 separate demo
accounts (one per role) once Supabase Auth is live, and log out/in between
them during the demo — see `06_Phasewise_Vibecoding_Prompts.md` Phase 1.

### 0.2 Process
UI for ORCA is designed **first in Google Stitch** (stitch.withgoogle.com), then
translated into Next.js/Tailwind/shadcn code phase-wise. This splits "what it
should look like" (Stitch) from "how it's built" (coding tool), which gives
much more consistent, polished output than asking a coding tool to invent
layout on the fly.

**Process:**
1. Set a **global style prompt** in Stitch first (see §3 below) so every screen
   it generates shares the same palette/typography/mood.
2. Generate each screen listed in §2 as its own Stitch prompt (prompts provided
   per screen below). Iterate in Stitch until happy — this is cheap/fast compared
   to iterating in code.
3. Export each finished screen from Stitch (PNG/JPG screenshot at minimum;
   HTML/CSS or Figma handoff if Stitch's export supports it) into
   `docs/stitch-exports/<screen-name>.png`.
4. When prompting the coding tool (see `06_Phasewise_Vibecoding_Prompts.md`),
   reference the relevant exported design explicitly: attach the image/HTML and
   say "match this layout, spacing, color and component style" — the coding
   tool then focuses on wiring real data/logic rather than guessing UI.
5. Keep Stitch as the single source of visual truth — if a screen's design
   changes, update it in Stitch, re-export, and re-prompt the coding tool with
   the new reference rather than hand-editing styles ad hoc in code.

## 1. UX Principles
- **Chat-first, map-second:** every screen keeps a persistent chat affordance; the map is the visual grounding for chat answers.
- **Role at the center:** role is chosen **once**, via a first-login modal (not a dedicated onboarding flow, in the current trimmed build). It is **locked after signup** — no header switcher or in-app way to change it, since role gates which data/features a user can access. (For demoing all personas to judges, use separate seeded demo accounts — see `06_Phasewise_Vibecoding_Prompts.md`.)
- **Trust through evidence:** every AI answer shows a small "Sources" chip (dataset + timestamp).
- **Progressive disclosure:** Tourist/Fisherman get simple badges by default; "Show details" reveals raw data for power users.

## 2. Core Screens

*(§2.1 and §2.4 below describe the full original vision. The current build
uses only Monitor / AI Chat / Alerts — see §0.1 for what's actually shipping.)*

### 2.1 Auth / Profile — original vision vs. what's built
Original vision: role selection screen, home region picker, all part of a dedicated onboarding flow.

**Actually built:** plain Login/Signup pages (email+password, Google OAuth), a first-login **role-selection modal** (5 persona cards, role locked once chosen — see §0.1a), and a **Profile page** with:
- Identity card (name, email, sign out)
- Role shown as a **read-only badge** (not editable)
- Home region: sector name search + "Use My Location" (browser geolocation)
- Language selector, in this order: **English, Hindi (हिंदी), Marathi (मराठी), Gujarati (ગુજરાતી), Odia (ଓଡ଼ିଆ), Tamil (தமிழ்)**

No separate onboarding wizard or dedicated route-based dashboard-per-role — everything role-dependent renders inside Monitor (§2.4).

### 2.2 Main App Shell
- Header nav: **Monitor**, **AI Chat**, **Alerts** — this is the complete primary nav. **Guide is not in the header at all** (admin/dev-only reference, reachable only by typing `/guide` directly — see §0.1a note below on Guide access).
- Header shows the current role as a **read-only badge** (not editable — see §0.1a) and a profile icon (links to Profile page, which has the language switcher).
- Persistent chat access via its own "AI Chat" tab.

### 2.3 Chat Interface
- Message bubbles; assistant messages can embed:
  - Mini-map snippet (region referenced)
  - Chart (for Researcher trend queries)
  - Safety badge card (green/amber/red) for Tourist/Fisherman
  - Source citation chip (e.g., "INCOIS PFZ, updated 2h ago")
- Suggested prompt chips per role (e.g., Tourist sees "Is it safe to swim today?"; Researcher sees "Compare SST last 30 days").

### 2.4 Monitor Screen (current build — merges Map + all persona dashboards)
One screen, one route, **content is role-aware** — same principle as the chat's persona-conditioned responses, just applied to a dashboard layout instead of chat replies:
- **Base layer (all roles):** the interactive map (SST/chlorophyll/wind-wave/PFZ/alerts layers, same as originally planned for the standalone Map view).
- **Role-conditioned widget panel** alongside/below the map, swapped based on `profiles.role`:
  - *Fisherman:* safety verdict card, nearest PFZ, 3-day forecast strip.
  - *Researcher:* region/date-range selector, trend chart, export button.
  - *Coastal Authority:* active alerts table, risk heatmap summary, situation-report export.
  - *Tourist:* nearby beaches list with safety badges, plain-language tips.
  - *Maritime Operator:* route input, hazard-along-route list.
- Implementation note: build this as one `MonitorScreen` component with a `<RoleWidgetPanel role={profile.role} />` that switches on role internally, rather than 5 separate routed dashboard pages — keeps it to the single Stitch-designed screen instead of 5.

*(Original per-persona dashboard breakdown, kept for reference if you later split these into separate routes/screens:)*
- **Fisherman:** Today's PFZ map, safety verdict card, nearest harbor, 3-day forecast strip.
- **Researcher:** Region/date range selector, trend charts (SST/chlorophyll), export button (CSV/GeoJSON), data source panel.
- **Coastal Authority:** Active alerts table (severity-sorted), risk heatmap, affected-area population estimate, "generate situation report" export.
- **Tourist:** Nearby beaches list with safety badges, weather-safe window, simple do/don't tips, nearest rescue/medical point.
- **Maritime Operator:** Route input (origin→destination), hazard-along-route list, safety score.

### 2.5 Alerts Center
- List + map view of active alerts, filter by type/severity/region, subscribe toggle per region.

## 3. Visual Design Direction & Stitch Prompts

### 3.1 Design principles (feed into every Stitch prompt)
- Palette: deep ocean blue (#0B3D62) primary, teal/aqua accent (#1FA2A8), warm coral (#FF6B4A) for alerts/CTAs, neutral grays for text — evokes marine/ISRO tech without being generic "startup blue."
- Typography: Inter or similar geometric sans for UI; slightly rounded for approachability (fisherman/tourist audiences aren't necessarily technical).
- Safety badges: consistent 3-state color system (green/amber/red) used identically across Fisherman & Tourist views for recognizability.
- Map style: dark-mode ocean basemap by default (data pops visually); light mode toggle available.
- Mobile-first breakpoints; bottom-nav on mobile instead of sidebar.

### 3.2 Global Stitch style prompt (set this first, in a "style guide" or first screen, and reuse its language in every subsequent screen prompt)
```
Design style: modern marine/ocean-tech product for a government-linked AI
platform (ISRO-affiliated), used by fishermen, researchers, coastal disaster
authorities, and tourists. Deep ocean blue (#0B3D62) as primary color, teal/
aqua (#1FA2A8) as accent, warm coral (#FF6B4A) reserved for alerts/warnings/
CTAs, neutral light grays for backgrounds and cards. Clean geometric sans-serif
typography (Inter-style), generous rounded corners (rounded-lg), soft shadows,
minimal but trustworthy — not playful/startup-generic. Dark, deep-ocean-toned
navigation and map surfaces contrasted with light, airy content cards. Should
feel credible to a government/disaster-management audience while remaining
approachable to non-technical users like fishermen and tourists on mobile.
Mobile-first responsive layouts.
```

### 3.3 Per-screen Stitch prompts
Use these as individual Stitch generations (prepend the global style prompt from §3.2, or reference "match my ORCA style guide" if Stitch supports a saved style):

**Landing page**
```
A marine AI platform landing page called "ORCA". Hero section with a bold
headline about turning ocean/satellite data into simple guidance for
fishermen, researchers, coastal authorities, and tourists. Ocean-themed dark
hero background (subtle wave/satellite imagery feel), a prominent "Get
Started" button, and a short row of 4-5 icon+label cards representing the
different user types. Clean footer.
```

**Login / Signup**
```
A clean, minimal login screen for a marine AI platform. Centered card on an
ocean-blue gradient background, email + password fields, a "Continue with
Google" button, and a link to sign up. Trustworthy, government-adjacent but
approachable feel.
```

**Onboarding — role selection**
```
An onboarding screen showing 5 large selectable role cards in a grid: Fisherman,
Researcher, Coastal Authority, Tourist, Maritime Operator. Each card has a
relevant icon, the role name, and one short line describing what that role
gets from the app (e.g. Tourist: "Beach safety in plain language"). One card
is shown in a selected/highlighted state. Progress indicator at top (step 1 of 2).
```

**Onboarding — home region picker**
```
Step 2 of onboarding: a full-width map with a search bar above it ("Search
your region") and a "Use my current location" button, a pin marker shown on
the map, and a "Continue" button at the bottom.
```

**Main app shell / dashboard (generic frame)**
```
Main app dashboard frame for a marine AI platform: left sidebar navigation
(Home, Map, Chat, Alerts, Saved Locations, Profile) with icons, a top header
showing the user's selected role and a language switcher, and a main content
area. Include a persistent chat bubble/drawer trigger in the bottom-right.
```

**Chat interface**
```
A chat interface for an AI marine assistant. Message bubbles (user right-
aligned in teal, assistant left-aligned in white/light card), an assistant
message showing an embedded small map snippet and a colored safety badge
(green "Safe to swim"), a small "Source: INCOIS, updated 2h ago" citation
chip under the assistant message, suggested prompt chips above the input box,
and a text input with a send button at the bottom.
```

**Map view**
```
A full-screen interactive map interface for ocean data, dark basemap, with a
right-side collapsible layer panel showing toggles for SST, Chlorophyll, PFZ
Zones, Active Alerts, Wind/Wave, a date/time slider above the map, and colored
overlay regions on the map (blue-to-red heatmap gradient for temperature,
colored polygons for alert zones).
```

**Fisherman dashboard**
```
A dashboard for a fisherman user: a prominent safety verdict card at top
("Safe to sail today" in green with a short reason), a small map preview
showing nearby fishing zones, a 3-day weather forecast strip with simple
icons, and a large button "Ask ORCA about today's conditions".
```

**Researcher dashboard**
```
A data-dense dashboard for a researcher: a region + date range selector at
top, a line chart showing sea surface temperature trend over time, a second
chart for chlorophyll levels, a data source/methodology panel on the side,
and an "Export Data" button with format options (CSV, GeoJSON).
```

**Coastal Authority dashboard**
```
An operational dashboard for a coastal disaster management authority: a table
of active alerts with severity color tags (low/moderate/high/severe), a risk
heatmap map preview, a summary stat row (active alerts, regions affected,
population estimate), and a "Generate Situation Report" button. Should feel
like a serious command-center tool, denser and more data-heavy than other
dashboards.
```

**Tourist dashboard**
```
A friendly, simple dashboard for a tourist: a "Nearby Beaches" section shown
as large rounded cards with a photo-style background, beach name, a big
color-coded safety badge (green/amber/red), and one short plain-language tip
per card (e.g. "Calm water, great for swimming"). Minimal text, big touch
targets, mobile-first.
```

**Alerts center**
```
An alerts list/map screen: filter chips at top (type, severity), a list of
alert cards below each showing a severity-colored left border, alert type
icon, headline, affected region, and time validity, with a "Subscribe to this
region" toggle on each card. A small map with alert zones highlighted on the
right (desktop) or below (mobile).
```

*(See `frontend-design` skill guidance when translating these into actual components in code — avoid the default/templated shadcn look; stay faithful to what Stitch produces.)*

## 4. Database Schema (Postgres/PostGIS — Supabase) — v2 normalized schema

> Replaces the earlier per-datatype schema (separate `sst_readings`,
> `chlorophyll_readings`, `weather_forecasts`, `alerts` tables) with a
> normalized, auditable design: one `observations` table for all readings
> (tagged by type + source), a `data_sources` registry for provenance/
> reliability tracking, and explicit `risk_assessments`/`activity_assessments`
> as first-class auditable records.

```sql
-- Role enum (constrained, not free text)
create type user_role as enum ('tourist','fisher','authority','researcher','disaster_management','general');

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role not null,
  language text default 'en',
  home_region geography(Point,4326),
  created_at timestamptz default now()
);

-- Tourist-specific personalization (optional, only populated for role='tourist')
create table tourist_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  activities text[] default '{}',           -- e.g. {'beach_visit','boating'}
  travel_style text,
  updated_at timestamptz default now()
);

-- Conversations & messages (replaces chat_sessions/chat_messages naming)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Saved locations
create table locations (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  label text,
  geom geography(Point,4326) not null,
  created_at timestamptz default now()
);

-- Data source registry (provenance + LIVE/CACHED/DEMO honesty)
create table data_sources (
  id bigint generated always as identity primary key,
  name text not null,                        -- e.g. 'INCOIS PFZ', 'Open-Meteo Marine'
  type text not null,                        -- e.g. 'weather','ocean','gis','advisory'
  reliability text check (reliability in ('live','cached','demo')) not null default 'demo',
  updated_at timestamptz default now()
);

-- Normalized observations (replaces separate sst/chlorophyll/weather tables)
create table observations (
  id bigint generated always as identity primary key,
  source_id bigint references data_sources(id),
  observed_at timestamptz not null,
  geom geography(Point,4326) not null,
  metric text not null,                      -- e.g. 'sst_celsius','chlorophyll_mg_m3','wind_kmh','wave_height_m'
  value numeric not null
);

-- Map features (beaches, POIs, zones, PFZ, restricted/protected areas)
create table map_features (
  id bigint generated always as identity primary key,
  feature_type text not null,                -- 'beach','poi','pfz_zone','restricted_area','protected_area'
  name text,
  geom geography(Geometry,4326) not null,
  properties jsonb default '{}'
);

-- Auditable deterministic risk output
create table risk_assessments (
  id bigint generated always as identity primary key,
  conversation_id uuid references conversations(id),
  score numeric,
  level text check (level in ('low','moderate','high','severe')),
  factors jsonb,
  created_at timestamptz default now()
);

-- Auditable deterministic activity suitability output (Tourist-focused, usable by other roles too)
create table activity_assessments (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id),
  activity text,
  suitability text check (suitability in ('low','moderate','high','unsuitable')),
  factors jsonb,
  created_at timestamptz default now()
);

-- RAG knowledge base
create extension if not exists vector;
create table documents (
  id bigint generated always as identity primary key,
  title text,
  source_id bigint references data_sources(id),
  storage_path text,
  metadata jsonb default '{}'
);

create table document_chunks (
  id bigint generated always as identity primary key,
  document_id bigint references documents(id) on delete cascade,
  content text not null,
  embedding vector(1536)
);

-- Feedback & audit trail
create table feedback (
  id bigint generated always as identity primary key,
  message_id bigint references messages(id) on delete cascade,
  rating int,
  comment text,
  created_at timestamptz default now()
);

create table audit_events (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id),
  action text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
```

### 4.1 Role values
```
tourist | fisher | authority | researcher | disaster_management | general
```
Enforced via the `user_role` Postgres enum above — **never free-form text**.

### 4.2 Tourist RLS rules (from v2 spec §4.3)
- Tourist can read/update their own editable profile fields.
- `tourist_preferences` is private to that user.
- `conversations`, `messages`, `locations`, and activity history (`activity_assessments`) are user-owned (`user_id = auth.uid()`).
- Public/demo `map_features` layers are readable by anyone; sensitive layers require explicit backend authorization (checked in FastAPI, not just RLS).
- `audit_events` and `risk_assessments`/`activity_assessments` are **server-generated only** — no client insert/update policy.
- Privileged database/service credentials never reach the browser (FastAPI holds the service role key server-side only).

```sql
alter table tourist_preferences enable row level security;
create policy "own tourist prefs" on tourist_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table conversations enable row level security;
create policy "own conversations" on conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table locations enable row level security;
create policy "own locations" on locations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table map_features enable row level security;
create policy "public read map features" on map_features for select using (true);
-- sensitive feature_type values are filtered in FastAPI's query layer, not here

alter table risk_assessments enable row level security;
alter table activity_assessments enable row level security;
alter table audit_events enable row level security;
-- no insert/update policies for the above three — writes go through the
-- FastAPI service role only
```

### 4.3 Tourist evaluation set (golden queries — from v2 spec §4.4)
```json
[
  {"query": "Is it a good time to visit the beach tomorrow morning?",
   "role": "tourist", "activity": "beach_visit",
   "expected_tools": ["weather", "ocean", "advisory", "gis"]},
  {"query": "Can I go boating this weekend?",
   "role": "tourist", "activity": "boating",
   "expected_tools": ["weather", "ocean", "advisory", "gis"]},
  {"query": "Show me more suitable places for sightseeing nearby.",
   "role": "tourist", "activity": "sightseeing",
   "expected_tools": ["weather", "gis"]},
  {"query": "Why is boating unsuitable?",
   "role": "tourist", "activity": "boating",
   "expected_tools": ["risk_context"]}
]
```
Run this set (plus role-equivalent sets for Fisher/Authority/Researcher/Disaster
Management/General) via `pytest` after every phase — see `06_Phasewise_Vibecoding_Prompts.md`
for exactly when.

## 5. New Tourist-Specific UI Components (v2 addition — extend existing Monitor/Chat, don't rebuild)

The already-built Tourist widget (Beach Safety Guide, nearby beaches list,
do's/don'ts) is a good starting point. The v2 spec asks to **extend** it with:

| Component | Purpose |
|---|---|
| **Activity selector** | Beach Visit / Boating / Sightseeing / Water Recreation — shown on first Tourist login (alongside/after role selection) and editable later in Profile |
| **Location selector** | Current / saved / search location |
| **Time selector** | Now / today / tomorrow / custom |
| **Suitability card** | Score + LOW / MODERATE / HIGH / UNSUITABLE label |
| **Condition cards** | Wind, waves, rain/storm, and other relevant metrics |
| **Warnings** | Official/advisory info with timestamp, visually prominent |
| **Map** | Nearby places, suitability overlay, zones, risk (extends the existing Monitor map) |
| **Why? panel** | The deterministic factors behind the suitability result — this is what makes the Risk/Suitability Engine's output explainable, not a black box |
| **Sources** | Evidence + retrieval time, always shown for live-data claims |

**Tourist language guidelines (apply to all copy in these components):**
- Say "more suitable based on available conditions," never guarantee safety.
- Surface official warnings prominently, above ORCA's own framing.
- If data is missing, say what's missing — don't silently omit it.
- Keep the main answer simple; put technical detail in the Why/Evidence panel.
- Never imply ORCA replaces lifeguards, authorities, or official warnings.

## 6. API Design (FastAPI routes — replaces earlier Next.js API route design)

| Endpoint | Method | Purpose |
|---|---|---|
| `/chat` | POST (streamed) | Send message → runs the LangGraph agent system → streamed response + sources + which agents ran |
| `/map-layers?type=...&bbox=...&date=...` | GET | Fetch `observations`/`map_features` for current viewport |
| `/activity` | GET/PATCH | Tourist activity selection (`tourist_preferences`) |
| `/alerts?region=...` | GET | Active alert-worthy `risk_assessments` for a region |
| `/export?dataset=...&format=csv\|geojson&range=...` | GET | Researcher data export (signed URL via Supabase Storage) |
| `/locations` | GET/POST/DELETE | Manage saved locations |
| `/profile` | GET/PATCH | Role (read-only after first set), language, home region |
| `/feedback` | POST | Message rating/comment |

All routes require a verified Supabase JWT (FastAPI dependency) and derive
`user_id`/role server-side — no route accepts a client-supplied role.

## 7. Agent Tool Contracts (per-agent, for LangGraph tool-calling)

```json
{
  "name": "get_sst",
  "description": "Get sea surface temperature near a location/date range",
  "parameters": {"lat": "number", "lon": "number", "radius_km": "number", "date": "string"}
}
```

| Agent | Tools |
|---|---|
| Weather Agent | `get_weather`, `get_cyclone_track` |
| Ocean Agent | `get_sst`, `get_chlorophyll`, `get_pfz` |
| GIS Agent | `get_nearby_features`, `intersect_zone`, `get_bbox_features` |
| Advisory/RAG Agent | `rag_search(query, category)` |
| (Risk/Suitability, Recommendation) | Consume prior results directly from graph state — no external tools of their own |

Keep each tool's output schema strict JSON (Pydantic-validated) so downstream
agents and the frontend can reliably render structured widgets (chart data,
badge level, map highlight geometry) from it.

## 8. Accessibility & Localization
- WCAG AA color contrast for alert/suitability badges (icon/text label alongside color, not color alone).
- All persona-facing copy externalized for `next-intl` translation; backend localization rolls out English → Hindi → Marathi first (v2 Phase 4), Gujarati/Odia/Tamil after (UI already supports all six).
