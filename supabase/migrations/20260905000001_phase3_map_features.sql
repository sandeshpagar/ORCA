-- ORCA Phase 3: PostGIS Map Features Schema & Demo Geometries
-- Reference: docs/04_Design_Document.md §4

-- 1. Ensure PostGIS is active
create extension if not exists postgis;

-- 2. Map Features Table
create table if not exists map_features (
  id bigint generated always as identity primary key,
  feature_type text not null,                  -- 'beach','poi','protected_area','restricted_area','activity_zone','risk_zone'
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  geom geography(Geometry, 4326),
  geometry_json jsonb,                         -- GeoJSON representation
  properties jsonb default '{}'::jsonb,
  reliability text not null default 'demo',    -- 'live','cached','demo' (PRD §8)
  created_at timestamptz default now()
);

-- 3. Spatial Index for Fast Bounding-Box & Proximity Intersect Queries
create index if not exists idx_map_features_geom on map_features using gist (geom);
create index if not exists idx_map_features_type on map_features (feature_type);

-- 4. Row Level Security
alter table map_features enable row level security;

-- Public can read all non-classified features (or check allowed_roles)
create policy "allow select for public map features"
  on map_features for select
  using (
    properties->'allowed_roles' ? '*'
    or properties->'allowed_roles' ? auth.jwt()->>'role'
    or auth.jwt()->>'role' in ('authority', 'disaster_management')
  );
