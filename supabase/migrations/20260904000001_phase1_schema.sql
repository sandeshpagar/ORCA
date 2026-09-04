-- ORCA Phase 1 Database Schema (Supabase / Postgres / PostGIS)
-- Reference: docs/04_Design_Document.md §4

-- Enable PostGIS if available
create extension if not exists postgis;

-- 1. Role enum (constrained, not free text)
create type user_role as enum ('tourist', 'fisher', 'authority', 'researcher', 'disaster_management', 'general');

-- 2. Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role user_role not null default 'general',
  language text default 'en',
  home_region geography(Point, 4326),
  home_region_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Tourist-specific personalization (only populated for role='tourist')
create table if not exists tourist_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  activities text[] default '{}',           -- e.g. {'beach_visit','boating','sightseeing','water_recreation'}
  travel_style text default 'leisure',
  language text default 'English',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Data source registry (provenance + LIVE/CACHED/DEMO honesty)
create table if not exists data_sources (
  id bigint generated always as identity primary key,
  name text not null,                        -- e.g. 'Open-Meteo Marine & Weather API', 'INCOIS PFZ', 'Bhuvan ISRO'
  type text not null,                        -- e.g. 'weather', 'ocean', 'gis', 'advisory'
  reliability text check (reliability in ('live', 'cached', 'demo')) not null default 'demo',
  updated_at timestamptz default now()
);

-- 5. Normalized observations (replaces separate tables)
create table if not exists observations (
  id bigint generated always as identity primary key,
  source_id bigint references data_sources(id) on delete set null,
  observed_at timestamptz not null,
  geom geography(Point, 4326) not null,
  metric text not null,                      -- e.g. 'sst_celsius','chlorophyll_mg_m3','wind_kmh','wave_height_m'
  value numeric not null
);

-- 6. Conversations & Messages
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- 7. Row Level Security (RLS) policies
alter table profiles enable row level security;
alter table tourist_preferences enable row level security;
alter table data_sources enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Profiles: users can read their own profile; service role can read/write all
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Tourist Preferences: users can read and update their own preferences
create policy "Users can view own tourist preferences" on tourist_preferences for select using (auth.uid() = user_id);
create policy "Users can update own tourist preferences" on tourist_preferences for update using (auth.uid() = user_id);
create policy "Users can insert own tourist preferences" on tourist_preferences for insert with check (auth.uid() = user_id);

-- Data Sources: publicly readable for transparency
create policy "Anyone can read data sources" on data_sources for select using (true);
