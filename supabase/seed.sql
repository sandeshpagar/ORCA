-- ORCA Phase 1 Seed Data
-- Reference: docs/02_Tech_Stack.md §8 and docs/04_Design_Document.md §4

insert into data_sources (name, type, reliability)
values
  ('Open-Meteo Marine & Weather API', 'weather', 'live'),
  ('INCOIS Potential Fishing Zone (PFZ)', 'ocean', 'cached'),
  ('ISRO Oceansat-3 OCM-3 Chlorophyll', 'ocean', 'cached'),
  ('IMD Cyclone Warning Division', 'advisory', 'live'),
  ('Gopalpur Coastal Buoy BD-12', 'ocean', 'live')
on conflict do nothing;
