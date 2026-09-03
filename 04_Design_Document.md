# Design Document — ORCA

## 0. Design Workflow: Google Stitch → Vibe-Coded UI

### 0.1 Current build scope (read this first)
The sections below describe the **full original vision** (5 persona dashboards,
separate landing/login/onboarding screens). The **actual build in progress**
uses a trimmed 4-screen structure, generated in Stitch and exported to
Antigravity:

| Actual screen | Replaces / merges | Notes |
|---|---|---|
| **Style Guide** | — | Internal design-token reference, not a shipped app screen |
| **Monitor** | Map view + all 5 persona dashboards | One screen; widgets/content shown are **role-aware** (same pattern as chat) rather than separate components per persona — see §2.2 below |
| **AI Chat** | Chat interface | As originally designed |
| **Alerts** | Alerts center | As originally designed |
| *(none yet)* | Landing / Login / Onboarding / role selection | **Not designed in Stitch.** Recommended fix: add a simple role dropdown in the app header (reuses the "Main app shell" concept below) instead of a dedicated onboarding flow, to keep scope tight. Auth screens themselves (login/signup) can use a plain Supabase Auth form with minimal styling — low design risk, not worth a Stitch pass. |

If you later have time to build out full per-persona dashboards or a proper
onboarding flow, the original designs in §2 and §3.3 are ready to use as-is —
this is just documenting what's actually shipping first.

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
- **Role at the center:** role is chosen via a header dropdown (not a dedicated onboarding flow, in the current trimmed build) and always visible/switchable (for demo purposes, easy role-switching is valuable to judges).
- **Trust through evidence:** every AI answer shows a small "Sources" chip (dataset + timestamp).
- **Progressive disclosure:** Tourist/Fisherman get simple badges by default; "Show details" reveals raw data for power users.

## 2. Core Screens

*(§2.1 and §2.4 below describe the full original vision. The current build
uses only Monitor / AI Chat / Alerts — see §0.1 for what's actually shipping.)*

### 2.1 Onboarding / Auth — full vision (not built yet)
- Sign up / login (email+password, Google OAuth).
- Role selection screen (Fisherman / Researcher / Coastal Authority / Tourist / Maritime Operator) — large icon cards.
- Home region / default location picker (map click or search).

**Current build instead:** plain Supabase Auth login/signup form (default styling, low design priority) + a role dropdown in the app header (part of Main App Shell, §2.2) that sets `profiles.role` directly — no separate onboarding steps.

### 2.2 Main App Shell
- Bottom nav (mobile) / top nav (desktop): **Guide** (style reference, dev-only), **Monitor**, **AI Chat**, **Alerts**.
- Header shows the current role (dropdown to switch) and a language switcher.
- Persistent chat access — either its own "AI Chat" tab (current build) or a collapsible drawer (original vision), your call based on what Antigravity ships from the Stitch export.

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

## 4. Database Schema (Postgres/PostGIS — Supabase)

```sql
-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text check (role in ('fisherman','researcher','coastal_authority','tourist','maritime_operator')) not null,
  preferred_language text default 'en',
  home_region geography(Point,4326),
  created_at timestamptz default now()
);

-- Oceanographic time-series (grid or point readings)
create table sst_readings (
  id bigint generated always as identity primary key,
  location geography(Point,4326) not null,
  value_celsius numeric not null,
  source text not null,
  recorded_at timestamptz not null
);

create table chlorophyll_readings (
  id bigint generated always as identity primary key,
  location geography(Point,4326) not null,
  value_mg_m3 numeric not null,
  source text not null,
  recorded_at timestamptz not null
);

create table weather_forecasts (
  id bigint generated always as identity primary key,
  location geography(Point,4326) not null,
  wind_speed_kmh numeric,
  wave_height_m numeric,
  condition text,
  forecast_for timestamptz not null,
  source text not null,
  fetched_at timestamptz default now()
);

-- Zones & advisories
create table pfz_zones (
  id bigint generated always as identity primary key,
  region geography(Polygon,4326) not null,
  description text,
  valid_from timestamptz,
  valid_to timestamptz,
  source text
);

create table alerts (
  id bigint generated always as identity primary key,
  type text check (type in ('cyclone','high_wave','storm_surge','rip_current','other')) not null,
  severity text check (severity in ('low','moderate','high','severe')) not null,
  affected_area geography(Polygon,4326) not null,
  headline text not null,
  details text,
  valid_from timestamptz not null,
  valid_to timestamptz,
  source text,
  created_at timestamptz default now()
);

-- Personalization
create table saved_locations (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  label text,
  location geography(Point,4326) not null,
  created_at timestamptz default now()
);

create table notification_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  region geography(Polygon,4326) not null,
  alert_types text[] default '{}',
  created_at timestamptz default now()
);

-- Conversation / agent
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  started_at timestamptz default now()
);

create table chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  tool_calls jsonb,
  created_at timestamptz default now()
);

create table chat_message_sources (
  id bigint generated always as identity primary key,
  message_id bigint references chat_messages(id) on delete cascade,
  dataset text not null,
  reference_time timestamptz
);

-- RAG knowledge base
create extension if not exists vector;
create table knowledge_docs (
  id bigint generated always as identity primary key,
  title text,
  content text not null,
  embedding vector(1536),
  category text
);
```

### Row-Level Security (example)
```sql
alter table saved_locations enable row level security;
create policy "Users manage own saved locations"
  on saved_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table chat_sessions enable row level security;
create policy "Users access own chat sessions"
  on chat_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public-read reference data
alter table alerts enable row level security;
create policy "Public read alerts" on alerts for select using (true);
```

## 5. API Design (Next.js route handlers)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Send message → returns streamed agent response + sources |
| `/api/map-layers?type=sst\|chlorophyll\|pfz\|alerts&bbox=...&date=...` | GET | Fetch layer data for current viewport |
| `/api/alerts?region=...` | GET | Active alerts for a region |
| `/api/alerts/subscribe` | POST | Create/update notification subscription |
| `/api/export?dataset=...&format=csv\|geojson&range=...` | GET | Researcher data export (signed URL) |
| `/api/locations` | GET/POST/DELETE | Manage saved locations |
| `/api/profile` | GET/PATCH | Role, language, home region |

## 6. Agent Tool Contracts (for the LLM's tool-calling)
```json
{
  "name": "get_sst",
  "description": "Get sea surface temperature near a location/date range",
  "parameters": {"lat": "number", "lon": "number", "radius_km": "number", "date": "string"}
}
```
Similarly define `get_chlorophyll`, `get_weather`, `get_pfz`, `get_active_alerts`, `rag_search(query, category)`, `export_dataset(dataset, filters)`. Keep each tool's output schema strict JSON so the LLM can reliably format UI widgets (chart data, badge level, map highlight geometry).

## 7. Accessibility & Localization
- WCAG AA color contrast for alert badges (don't rely on color alone — add icon/text label too, since color-blind users must distinguish severity).
- All persona-facing copy externalized for `next-intl` translation.
