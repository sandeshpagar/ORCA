"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/supabase";
import RoleWidgetPanel from "@/components/RoleWidgetPanel";
import type { SectorHubData } from "@/components/OceanLeafletMap";

const OceanLeafletMap = dynamic(() => import("@/components/OceanLeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 w-full h-full bg-[#071322] flex items-center justify-center">
      <div className="flex items-center gap-2 text-secondary font-mono text-xs">
        <span className="w-3 h-3 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
        <span>Initializing ISRO NavIC Ocean GIS Canvas...</span>
      </div>
    </div>
  ),
});

type LayerType = "swell" | "wind" | "sst" | "radar" | "bathy";
type TouristFilterType = "all" | "beaches" | "protected" | "restricted" | "risk" | "activity";
type MapSourceMode = "gis" | "windy";

interface MapFeatureData {
  id: number;
  name: string;
  feature_type: "beach" | "poi" | "protected_area" | "restricted_area" | "activity_zone" | "risk_zone";
  latitude: number;
  longitude: number;
  geometry?: {
    type: string;
    coordinates: any;
  };
  properties: {
    region_id?: string;
    category?: string;
    patrol_status?: string;
    amenities?: string[];
    suitable_activities?: string[];
    caution_notes?: string;
    status?: string;
    restriction?: string;
    hazard_level?: string;
    warning?: string;
    clearance?: string;
    is_restricted?: boolean;
    allowed_roles?: string[];
    shelter_rating?: string;
    visiting_hours?: string;
    wave_height_threshold?: string;
  };
  reliability?: string;
}

interface MapLayersResponse {
  layers: {
    beaches?: MapFeatureData[];
    pois?: MapFeatureData[];
    protected_areas?: MapFeatureData[];
    restricted_areas?: MapFeatureData[];
    activity_zones?: MapFeatureData[];
    risk_zones?: MapFeatureData[];
  };
  total_features: number;
  requesting_user_role: string;
  bbox?: { min_lon: number; min_lat: number; max_lon: number; max_lat: number };
  data_mode: string;
  attribution: string;
}

interface CoastalRegion {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  defaultZoom: number;
  description: string;
  buoyStation: string;
}

const COASTAL_REGIONS: CoastalRegion[] = [
  {
    id: "odisha",
    name: "Gopalpur & Odisha Coast",
    state: "Odisha",
    center: [19.31, 84.91],
    defaultZoom: 9,
    description: "Gopalpur, Puri, Paradip & Rushikulya Sanctuaries",
    buoyStation: "Buoy BD-12 (Gopalpur Deep)",
  },
  {
    id: "maharashtra",
    name: "Maharashtra & Mumbai",
    state: "Maharashtra",
    center: [18.95, 72.82],
    defaultZoom: 10,
    description: "Juhu, Marine Drive, Western Naval Command & JNPT",
    buoyStation: "Buoy AD-06 (Mumbai High)",
  },
  {
    id: "goa",
    name: "Goa Coastal Sector",
    state: "Goa",
    center: [15.45, 73.80],
    defaultZoom: 10,
    description: "Calangute, Miramar, Palolem & Grande Island",
    buoyStation: "Buoy AD-07 (Mormugao Outer)",
  },
  {
    id: "gujarat",
    name: "Gujarat & Gulf of Kutch",
    state: "Gujarat",
    center: [22.40, 69.50],
    defaultZoom: 8,
    description: "Shivrajpur, Okha Naval Gateway & Kandla Fairway",
    buoyStation: "Buoy AD-02 (Gulf of Kutch)",
  },
  {
    id: "karnataka",
    name: "Karnataka Coast & Karwar",
    state: "Karnataka",
    center: [13.80, 74.50],
    defaultZoom: 9,
    description: "Gokarna, Panambur & New Mangalore Port",
    buoyStation: "Buoy AD-09 (Karwar Outer)",
  },
  {
    id: "kerala",
    name: "Kerala & Malabar Coast",
    state: "Kerala",
    center: [9.50, 76.50],
    defaultZoom: 9,
    description: "Kovalam, Varkala, Kochi Deepwater & INS Dronacharya",
    buoyStation: "Buoy CB-02 (Cochin Deep)",
  },
  {
    id: "tamil_nadu",
    name: "Tamil Nadu & Coromandel Coast",
    state: "Tamil Nadu",
    center: [11.50, 79.85],
    defaultZoom: 8,
    description: "Marina Beach, Mahabalipuram, Chennai Port & Dhanushkodi",
    buoyStation: "Buoy BD-08 (Chennai Basin)",
  },
  {
    id: "andhra_pradesh",
    name: "Andhra Pradesh & Vizag",
    state: "Andhra Pradesh",
    center: [17.70, 83.30],
    defaultZoom: 9,
    description: "Rushikonda, RK Beach & Eastern Naval Command",
    buoyStation: "Buoy BD-10 (Vizag Shelf)",
  },
  {
    id: "west_bengal",
    name: "West Bengal & Sundarbans",
    state: "West Bengal",
    center: [21.75, 88.20],
    defaultZoom: 9,
    description: "Digha Sea Beach & Sundarbans Mangrove Reserve",
    buoyStation: "Buoy BD-14 (Sandheads Deep)",
  },
  {
    id: "islands",
    name: "Andaman & Nicobar Islands",
    state: "Andaman & Nicobar",
    center: [11.65, 92.75],
    defaultZoom: 8,
    description: "Radhanagar Beach & Ten Degree Channel Grid",
    buoyStation: "Buoy CB-05 (Andaman Sea)",
  },
];

interface SearchLocation {
  name: string;
  category: "sector" | "beach" | "port" | "sanctuary" | "hazard" | "feature";
  lat: number;
  lon: number;
  subtitle: string;
  featureId?: number;
}

const COASTAL_SECTORS: SearchLocation[] = [
  // Odisha Sector
  { name: "Gopalpur-on-Sea", category: "sector", lat: 19.2605, lon: 84.9042, subtitle: "Odisha Southern Coastal Hub & Lifeguard Zone" },
  { name: "Aryapalli Sands", category: "beach", lat: 19.3082, lon: 84.9621, subtitle: "Casuarina Grove & Steep Shelf Shore · Odisha" },
  { name: "Rushikulya River Mouth", category: "sanctuary", lat: 19.3621, lon: 85.0841, subtitle: "Olive Ridley Sea Turtle Mass Nesting Sanctuary · Odisha" },
  { name: "Gopalpur Commercial Port", category: "port", lat: 19.2950, lon: 84.9500, subtitle: "Deepwater Fairway & Commercial Bulk Terminal · Odisha" },
  { name: "Puri Golden Beach", category: "beach", lat: 19.7925, lon: 85.8236, subtitle: "Blue Flag Certified Shore · Bathing Water Zone · Odisha" },
  { name: "Chandrabhaga Coast", category: "beach", lat: 19.8642, lon: 86.1118, subtitle: "Konark Marine Promenade & Eco-Retreat · Odisha" },
  { name: "Paradip Port & Estuary", category: "port", lat: 20.2644, lon: 86.6698, subtitle: "Major Deepwater Maritime Terminal & Estuarine Zone · Odisha" },
  { name: "Chilika Lake Sea Mouth", category: "sanctuary", lat: 19.7000, lon: 85.3200, subtitle: "Ramsar Site #229 · Irrawaddy Dolphin Marine Corridor · Odisha" },
  { name: "Chandipur Beach", category: "beach", lat: 21.4682, lon: 87.0216, subtitle: "Unique Receding Tide Phenomenon (Up to 5km) · Odisha" },
  // Maharashtra & Mumbai Sector
  { name: "Juhu Beach Lifeguard Station", category: "beach", lat: 19.0988, lon: 72.8264, subtitle: "Patrolled Urban Shore & Watchtowers · Maharashtra" },
  { name: "Girgaon Chowpatty & Marine Drive", category: "beach", lat: 18.9548, lon: 72.8155, subtitle: "Queen's Necklace Coastal Promenade · Maharashtra" },
  { name: "Western Naval Command Base", category: "sector", lat: 18.9100, lon: 72.8400, subtitle: "Classified Naval Dockyard Fairway · Maharashtra" },
  { name: "JNPT Bulk Carrier Fairway", category: "port", lat: 18.9500, lon: 72.9500, subtitle: "Major Container Terminal Navigational Channel · Maharashtra" },
  { name: "Tarkarli Coral Reef", category: "sanctuary", lat: 16.0354, lon: 73.4912, subtitle: "Malvan Marine Protected Shelf · Maharashtra" },
  { name: "Kashid Rip Current Hazard", category: "hazard", lat: 18.4286, lon: 72.9056, subtitle: "Steep Sand Slope Rip Undertow · Maharashtra" },
  // Goa Sector
  { name: "Calangute & Baga Beach", category: "beach", lat: 15.5439, lon: 73.7553, subtitle: "Drishti Lifeguard Stationed Shore · Goa" },
  { name: "Miramar Beach Mandovi", category: "beach", lat: 15.4820, lon: 73.8070, subtitle: "Estuarine Marine Promenade · Goa" },
  { name: "Grande Island Coral Reserve", category: "sanctuary", lat: 15.3522, lon: 73.7667, subtitle: "Marine Scuba & Coral Conservation Zone · Goa" },
  { name: "Mormugao Port Channel", category: "port", lat: 15.4167, lon: 73.8000, subtitle: "VTS Pilotage Deep Navigation Fairway · Goa" },
  { name: "Palolem Crescent Beach", category: "beach", lat: 15.0100, lon: 74.0232, subtitle: "Sheltered Natural Bay & Dolphin Cove · Goa" },
  // Gujarat Sector
  { name: "Shivrajpur Blue Flag Beach", category: "beach", lat: 22.3328, lon: 68.9556, subtitle: "Blue Flag Certified Coastal Bathing · Gujarat" },
  { name: "Gulf of Kutch Marine Park", category: "sanctuary", lat: 22.4600, lon: 69.6100, subtitle: "First Marine National Park in India · Gujarat" },
  { name: "Okha Naval Defense Corridor", category: "sector", lat: 22.4700, lon: 69.0600, subtitle: "Strategic Arabian Sea Naval Patrol Grid · Gujarat" },
  { name: "Kandla Commercial Fairway", category: "port", lat: 23.0033, lon: 70.2197, subtitle: "Deendayal Port Bulk Cargo Navigation Lane · Gujarat" },
  // Karnataka Sector
  { name: "Gokarna Om Beach", category: "beach", lat: 14.5186, lon: 74.3168, subtitle: "Natural Om Shaped Cove & Cliff Shore · Karnataka" },
  { name: "Panambur Beach Lifeguards", category: "beach", lat: 12.9536, lon: 74.8144, subtitle: "Panambur Lifesaving Base · Karnataka" },
  { name: "New Mangalore Port Fairway", category: "port", lat: 12.9250, lon: 74.8000, subtitle: "Deepwater Bulk & POL Cargo Channel · Karnataka" },
  // Kerala Sector
  { name: "Kovalam Lighthouse Beach", category: "beach", lat: 8.4021, lon: 76.9787, subtitle: "Safe Bathing Enclave & Lifeguards · Kerala" },
  { name: "Varkala Cliff Papanasam", category: "beach", lat: 8.7330, lon: 76.7032, subtitle: "Geo-Heritage Cliff Beach & Natural Springs · Kerala" },
  { name: "Cochin Port ICTT Fairway", category: "port", lat: 9.9667, lon: 76.2667, subtitle: "Vallarpadam Container Transshipment Fairway · Kerala" },
  { name: "INS Dronacharya Gunnery Range", category: "sector", lat: 9.9200, lon: 76.2400, subtitle: "Southern Naval Command Coastal Firing Grid · Kerala" },
  { name: "Munambam Rip Current Hazard", category: "hazard", lat: 10.1850, lon: 76.1620, subtitle: "Periyar Estuary Violent Undertow · Kerala" },
  // Tamil Nadu Sector
  { name: "Marina Beach Promenade", category: "beach", lat: 13.0500, lon: 80.2824, subtitle: "Coromandel Coastal Shore & CSG Post · Tamil Nadu" },
  { name: "Mahabalipuram Shore Temple Beach", category: "beach", lat: 12.6160, lon: 80.1980, subtitle: "UNESCO Marine Heritage Coastal Zone · Tamil Nadu" },
  { name: "Chennai Port Deep Fairway", category: "port", lat: 13.1000, lon: 80.3200, subtitle: "Major Maritime Commercial Channel · Tamil Nadu" },
  { name: "Dhanushkodi Adam's Bridge", category: "sanctuary", lat: 9.1760, lon: 79.4180, subtitle: "Gulf of Mannar Dugong Marine Sanctuary · Tamil Nadu" },
  // Andhra Pradesh Sector
  { name: "Rushikonda Blue Flag Beach", category: "beach", lat: 17.7819, lon: 83.3837, subtitle: "Blue Flag Certified Coastal Bathing · Andhra Pradesh" },
  { name: "Ramakrishna Beach Rip Hazard", category: "hazard", lat: 17.7125, lon: 83.3228, subtitle: "Submarine Shelf Dropoff Lethal Undertow · Andhra Pradesh" },
  { name: "Eastern Naval Command Corridor", category: "sector", lat: 17.6600, lon: 83.2900, subtitle: "Classified Naval Submarine Transit Grid · Andhra Pradesh" },
  // West Bengal Sector
  { name: "Digha Sea Beach Promenade", category: "beach", lat: 21.6266, lon: 87.5074, subtitle: "Bay of Bengal Coastal Resort & Marine Aquarium · West Bengal" },
  { name: "Sundarbans Estuary Mangrove Reserve", category: "sanctuary", lat: 21.8000, lon: 88.8000, subtitle: "UNESCO World Heritage Delta Biosphere · West Bengal" },
  // Islands Sector
  { name: "Radhanagar Beach Havelock", category: "beach", lat: 11.9840, lon: 92.9510, subtitle: "Blue Flag Pristine Coral Shore · Andaman & Nicobar" },
  { name: "Ten Degree Channel Security Sector", category: "sector", lat: 10.0000, lon: 92.5000, subtitle: "Strategic Island Maritime Defense Corridor · Andaman & Nicobar" },
];

interface DepthTelemetry {
  depth: string;
  label: string;
  sublabel: string;
  metric1: { name: string; value: string; unit: string; sub: string; color?: string };
  metric2: { name: string; value: string; unit: string; sub: string };
  metric3: { name: string; value: string; unit: string; sub: string; color?: string };
  metric4: { name: string; value: string; unit: string; sub: string; color?: string };
  status: string;
  statusColor: string;
  indicator: string;
}

const DEPTH_PROFILES: Record<string, DepthTelemetry> = {
  "0m": {
    depth: "0m",
    label: "Sea Surface Layer",
    sublabel: "Deep Bay of Bengal (Active Stream · 2m ago)",
    metric1: { name: "Swell", value: "2.8", unit: "m", sub: "210° SSW", color: "text-secondary" },
    metric2: { name: "Wind", value: "18", unit: "kts", sub: "Gust 24" },
    metric3: { name: "Sea SST", value: "29.4", unit: "°C", sub: "Optimal", color: "text-secondary" },
    metric4: { name: "Tide", value: "+0.4", unit: "m", sub: "Rising ↗", color: "text-secondary" },
    status: "Optimal",
    statusColor: "bg-surface-container-high text-on-secondary-container",
    indicator: "2.8m Swell · Optimal",
  },
  "-10m": {
    depth: "-10m",
    label: "Sub-Surface Shelf Layer (-10m Isobath)",
    sublabel: "INCOIS Acoustic Doppler Current Profiler (ADCP)",
    metric1: { name: "Internal Wave", value: "1.2", unit: "m", sub: "Thermocline", color: "text-cyan-400" },
    metric2: { name: "Current", value: "0.9", unit: "kts", sub: "Sub-surface Drift" },
    metric3: { name: "Water Temp", value: "26.8", unit: "°C", sub: "Stratified Gradient", color: "text-cyan-300" },
    metric4: { name: "Salinity", value: "34.1", unit: "PSU", sub: "Normal Haline", color: "text-cyan-400" },
    status: "Sub-Surface Safe",
    statusColor: "bg-cyan-500/20 text-cyan-300",
    indicator: "1.2m Wave · -10m Shelf",
  },
  "-50m": {
    depth: "-50m",
    label: "Benthic Deep Bathymetry (-50m Isobath)",
    sublabel: "Seabed Bottom-Mounted Ocean Bottom Sensor (OBS)",
    metric1: { name: "Hydro Pressure", value: "5.92", unit: "bar", sub: "592 kPa", color: "text-blue-400" },
    metric2: { name: "Benthic Flow", value: "0.4", unit: "kts", sub: "Abyssal Current" },
    metric3: { name: "Deep Temp", value: "21.2", unit: "°C", sub: "Cold Deep Layer", color: "text-blue-300" },
    metric4: { name: "Salinity", value: "34.8", unit: "PSU", sub: "High Deep Haline", color: "text-blue-400" },
    status: "Deep Bathymetry",
    statusColor: "bg-blue-500/20 text-blue-300",
    indicator: "5.9 bar · -50m Benthic",
  },
};

const BASELINE_FEATURES: MapFeatureData[] = [
  // 1. Odisha Sector
  {
    id: 1,
    name: "Gopalpur Main Beach & Lifeguard Station",
    feature_type: "beach",
    latitude: 19.2605,
    longitude: 84.9042,
    properties: {
      region_id: "odisha",
      category: "beach",
      patrol_status: "Lifeguards Active 06:00 - 18:00",
      amenities: ["Watchtower", "First Aid", "Shaded Promenade"],
      caution_notes: "Heavy shorebreak during afternoon high tide.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 2,
    name: "Aryapalli Pristine Shore & Sand Dunes",
    feature_type: "beach",
    latitude: 19.3082,
    longitude: 84.9621,
    properties: {
      region_id: "odisha",
      category: "beach",
      patrol_status: "Unpatrolled Shore",
      caution_notes: "Steep underwater gradient.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 3,
    name: "Rushikulya Marine Turtle Sanctuary",
    feature_type: "protected_area",
    latitude: 19.3621,
    longitude: 85.0841,
    properties: {
      region_id: "odisha",
      category: "sanctuary",
      restriction: "Protected Olive Ridley Sea Turtle nesting sanctuary.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 4,
    name: "Gopalpur Commercial Port Deepwater Fairway",
    feature_type: "restricted_area",
    latitude: 19.305,
    longitude: 84.975,
    properties: {
      region_id: "odisha",
      restriction: "Active deep-draft shipping fairway. Non-commercial crafts prohibited.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },
  {
    id: 5,
    name: "Gopalpur Shoals High Breaker Surge Polygon (Alert L3)",
    feature_type: "risk_zone",
    latitude: 19.255,
    longitude: 84.915,
    properties: {
      region_id: "odisha",
      hazard_level: "High",
      warning: "Violent breaking waves over shallow bar. High rollover risk.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 6,
    name: "Puri Regulated Water Sports Corridor",
    feature_type: "activity_zone",
    latitude: 19.325,
    longitude: 84.991,
    properties: {
      region_id: "odisha",
      suitable_activities: ["jet_ski", "kayaking", "boating"],
      amenities: ["Rental Kiosks", "Lifejackets Mandatory"],
      allowed_roles: ["*"],
    },
  },
  {
    id: 7,
    name: "Naval Defense Tactical Sector (Bravo-9 Grid)",
    feature_type: "restricted_area",
    latitude: 19.4500,
    longitude: 85.2000,
    properties: {
      region_id: "odisha",
      category: "restricted_area",
      restriction: "Active naval firing practice perimeter. Strictly restricted.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },

  // 2. Maharashtra & Mumbai Sector
  {
    id: 101,
    name: "Juhu Beach & Lifeguard Station",
    feature_type: "beach",
    latitude: 19.0988,
    longitude: 72.8264,
    properties: {
      region_id: "maharashtra",
      category: "beach",
      patrol_status: "Municipal Lifeguards Stationed 24/7",
      amenities: ["Watchtowers", "Promenade", "First Aid Center"],
      caution_notes: "High tide surges near rotary club exit.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 102,
    name: "Girgaon Chowpatty & Marine Drive",
    feature_type: "beach",
    latitude: 18.9548,
    longitude: 72.8155,
    properties: {
      region_id: "maharashtra",
      category: "beach",
      patrol_status: "Patrolled Urban Shore",
      amenities: ["Boardwalk", "Lighting", "Emergency Post"],
      caution_notes: "Intertidal mudflat gradient. Swimming prohibited.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 103,
    name: "Tarkarli Coral Reef Marine Sanctuary",
    feature_type: "protected_area",
    latitude: 16.0354,
    longitude: 73.4912,
    properties: {
      region_id: "maharashtra",
      category: "protected_area",
      restriction: "Protected live coral shelf. Anchoring strictly penalized.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 104,
    name: "JNPT Deepwater Bulk Carrier Fairway",
    feature_type: "restricted_area",
    latitude: 18.9500,
    longitude: 72.9500,
    properties: {
      region_id: "maharashtra",
      category: "restricted_area",
      restriction: "Major container shipping channel. Non-commercial vessels prohibited.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },
  {
    id: 105,
    name: "Western Naval Command Tactical Fairway",
    feature_type: "restricted_area",
    latitude: 18.9100,
    longitude: 72.8400,
    properties: {
      region_id: "maharashtra",
      category: "restricted_area",
      restriction: "Naval Dockyard restricted perimeter. Armed coastal patrol 24/7.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },
  {
    id: 106,
    name: "Kashid Beach Violent Rip Current Bar",
    feature_type: "risk_zone",
    latitude: 18.4286,
    longitude: 72.9056,
    properties: {
      region_id: "maharashtra",
      category: "risk_zone",
      hazard_level: "Severe Undertow Hazard",
      warning: "Steep sand slope creating deceptive rip tides. Bathing prohibited.",
      allowed_roles: ["*"],
    },
  },

  // 3. Goa Sector
  {
    id: 201,
    name: "Calangute & Baga Lifeguard Beach",
    feature_type: "beach",
    latitude: 15.5439,
    longitude: 73.7553,
    properties: {
      region_id: "goa",
      category: "beach",
      patrol_status: "Drishti Lifeguards Active 07:00 - 19:00",
      amenities: ["Watchtowers", "Medical Post", "Safety Flags"],
      caution_notes: "Red flags hoisted during monsoon swells.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 202,
    name: "Miramar Beach & Mandovi Shore",
    feature_type: "beach",
    latitude: 15.4820,
    longitude: 73.8070,
    properties: {
      region_id: "goa",
      category: "beach",
      patrol_status: "Patrolled Estuary Shore",
      amenities: ["Promenade", "Sunset Point"],
      caution_notes: "Estuarine confluence currents.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 203,
    name: "Grande Island Marine Coral Reserve",
    feature_type: "protected_area",
    latitude: 15.3522,
    longitude: 73.7667,
    properties: {
      region_id: "goa",
      category: "protected_area",
      restriction: "Strict no-spearfishing and no-anchor zone.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 204,
    name: "Mormugao Port Approach Deep Channel",
    feature_type: "restricted_area",
    latitude: 15.4167,
    longitude: 73.8000,
    properties: {
      region_id: "goa",
      category: "restricted_area",
      restriction: "Iron ore and cruise vessel navigation fairway. Clearance required.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },
  {
    id: 205,
    name: "Goa Naval Air & Sea Enclave (Vasco Grid)",
    feature_type: "restricted_area",
    latitude: 15.3800,
    longitude: 73.8200,
    properties: {
      region_id: "goa",
      category: "restricted_area",
      restriction: "Active naval aviation and coastal defense operations.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },
  {
    id: 206,
    name: "Aguada Estuary Sandbar Breaker Bar",
    feature_type: "risk_zone",
    latitude: 15.4920,
    longitude: 73.7710,
    properties: {
      region_id: "goa",
      category: "risk_zone",
      hazard_level: "Severe Breaking Bar",
      warning: "Violent shoaling breakers at Mandovi river mouth. High rollover hazard.",
      allowed_roles: ["*"],
    },
  },

  // 4. Gujarat Sector
  {
    id: 301,
    name: "Shivrajpur Blue Flag Beach",
    feature_type: "beach",
    latitude: 22.3328,
    longitude: 68.9556,
    properties: {
      region_id: "gujarat",
      category: "beach",
      patrol_status: "Blue Flag Certified · Fully Monitored",
      amenities: ["Clean Bathing Water", "Bio-toilets", "Solar Lighting"],
      allowed_roles: ["*"],
    },
  },
  {
    id: 302,
    name: "Gulf of Kutch Marine National Park",
    feature_type: "protected_area",
    latitude: 22.4600,
    longitude: 69.6100,
    properties: {
      region_id: "gujarat",
      category: "protected_area",
      restriction: "Mangrove habitat and live corals. Strict ecological protection zone.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 303,
    name: "Kandla / Deendayal Commercial Fairway",
    feature_type: "restricted_area",
    latitude: 23.0033,
    longitude: 70.2197,
    properties: {
      region_id: "gujarat",
      category: "restricted_area",
      restriction: "Active crude carrier & container channel.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },
  {
    id: 304,
    name: "Okha Naval Defense Corridor",
    feature_type: "restricted_area",
    latitude: 22.4700,
    longitude: 69.0600,
    properties: {
      region_id: "gujarat",
      category: "restricted_area",
      restriction: "Forward naval maritime patrol base perimeter.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },

  // 5. Karnataka Sector
  {
    id: 401,
    name: "Gokarna Om Beach & Kudle Shore",
    feature_type: "beach",
    latitude: 14.5186,
    longitude: 74.3168,
    properties: {
      region_id: "karnataka",
      category: "beach",
      patrol_status: "Coastal Police & Lifeguards on Duty",
      allowed_roles: ["*"],
    },
  },
  {
    id: 402,
    name: "Panambur Beach Lifeguard Station",
    feature_type: "beach",
    latitude: 12.9536,
    longitude: 74.8144,
    properties: {
      region_id: "karnataka",
      category: "beach",
      patrol_status: "Dedicated Lifesaving Association Base",
      allowed_roles: ["*"],
    },
  },
  {
    id: 403,
    name: "New Mangalore Port Approach Fairway",
    feature_type: "restricted_area",
    latitude: 12.9250,
    longitude: 74.8000,
    properties: {
      region_id: "karnataka",
      category: "restricted_area",
      restriction: "Deepwater bulk cargo and POL channel.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },

  // 6. Kerala Sector
  {
    id: 501,
    name: "Kovalam Lighthouse Beach & Crescent Cove",
    feature_type: "beach",
    latitude: 8.4021,
    longitude: 76.9787,
    properties: {
      region_id: "kerala",
      category: "beach",
      patrol_status: "Lifeguards Active · Safe Bathing Enclave",
      allowed_roles: ["*"],
    },
  },
  {
    id: 502,
    name: "Varkala Cliff Beach & Papanasam Springs",
    feature_type: "beach",
    latitude: 8.7330,
    longitude: 76.7032,
    properties: {
      region_id: "kerala",
      category: "beach",
      patrol_status: "Patrolled Cliff Shore",
      caution_notes: "Steep waves close to rocks during rising tide.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 503,
    name: "Cochin Port Trust Deepwater Shipping Lane",
    feature_type: "restricted_area",
    latitude: 9.9667,
    longitude: 76.2667,
    properties: {
      region_id: "kerala",
      category: "restricted_area",
      restriction: "International container transshipment fairway.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },
  {
    id: 504,
    name: "INS Dronacharya Naval Firing Sector",
    feature_type: "restricted_area",
    latitude: 9.9200,
    longitude: 76.2400,
    properties: {
      region_id: "kerala",
      category: "restricted_area",
      restriction: "Southern Naval Command live firing and radar range.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },
  {
    id: 505,
    name: "Munambam Estuary Sandbar Rip Hazard",
    feature_type: "risk_zone",
    latitude: 10.1850,
    longitude: 76.1620,
    properties: {
      region_id: "kerala",
      category: "risk_zone",
      hazard_level: "Violent Rip Current",
      warning: "Extreme undertow at Periyar river discharge. Swimming prohibited.",
      allowed_roles: ["*"],
    },
  },

  // 7. Tamil Nadu Sector
  {
    id: 601,
    name: "Marina Beach Promenade Chennai",
    feature_type: "beach",
    latitude: 13.0500,
    longitude: 80.2824,
    properties: {
      region_id: "tamil_nadu",
      category: "beach",
      patrol_status: "Coastal Security Group Active",
      caution_notes: "Severe undertow; bathing strictly barred by police.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 602,
    name: "Dhanushkodi Adam's Bridge Marine Sanctuary",
    feature_type: "protected_area",
    latitude: 9.1760,
    longitude: 79.4180,
    properties: {
      region_id: "tamil_nadu",
      category: "protected_area",
      restriction: "Dugong conservation habitat. Trawling banned.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 603,
    name: "Chennai Port Commercial Fairway",
    feature_type: "restricted_area",
    latitude: 13.1000,
    longitude: 80.3200,
    properties: {
      region_id: "tamil_nadu",
      category: "restricted_area",
      restriction: "Deepwater navigation fairway. Port control VHF Ch 14.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },

  // 8. Andhra Pradesh Sector
  {
    id: 701,
    name: "Rushikonda Blue Flag Beach Visakhapatnam",
    feature_type: "beach",
    latitude: 17.7819,
    longitude: 83.3837,
    properties: {
      region_id: "andhra_pradesh",
      category: "beach",
      patrol_status: "Blue Flag Certified · Professional Lifeguards",
      allowed_roles: ["*"],
    },
  },
  {
    id: 702,
    name: "Ramakrishna Beach Rip Hazard Zone",
    feature_type: "risk_zone",
    latitude: 17.7125,
    longitude: 83.3228,
    properties: {
      region_id: "andhra_pradesh",
      category: "risk_zone",
      hazard_level: "Submarine Shelf Undertow",
      warning: "Sudden deep dropoff with lethal rip currents. Swimming prohibited.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 703,
    name: "Eastern Naval Command Tactical Corridor",
    feature_type: "restricted_area",
    latitude: 17.6600,
    longitude: 83.2900,
    properties: {
      region_id: "andhra_pradesh",
      category: "restricted_area",
      restriction: "Submarine & fleet transit channel. Strictly prohibited zone.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },

  // 9. West Bengal Sector
  {
    id: 801,
    name: "Digha Sea Beach & Lifeguard Promenade",
    feature_type: "beach",
    latitude: 21.6266,
    longitude: 87.5074,
    properties: {
      region_id: "west_bengal",
      category: "beach",
      patrol_status: "Lifeguards & Coastal Police Active",
      allowed_roles: ["*"],
    },
  },
  {
    id: 802,
    name: "Sundarbans Estuary Mangrove Reserve",
    feature_type: "protected_area",
    latitude: 21.8000,
    longitude: 88.8000,
    properties: {
      region_id: "west_bengal",
      category: "protected_area",
      restriction: "Tidal delta biosphere reserve. Forest department clearance mandatory.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 803,
    name: "Haldia Port Deepwater Approach Fairway",
    feature_type: "restricted_area",
    latitude: 22.0200,
    longitude: 88.0800,
    properties: {
      region_id: "west_bengal",
      category: "restricted_area",
      restriction: "Major riverine port navigation fairway. Pilotage mandatory.",
      allowed_roles: ["authority", "fisher", "disaster_management", "tourist"],
    },
  },

  // 10. Islands Sector
  {
    id: 901,
    name: "Radhanagar Beach (Havelock Island)",
    feature_type: "beach",
    latitude: 11.9840,
    longitude: 92.9510,
    properties: {
      region_id: "islands",
      category: "beach",
      patrol_status: "Blue Flag Certified Sanctuary Shore",
      allowed_roles: ["*"],
    },
  },
  {
    id: 902,
    name: "Mahatma Gandhi Marine National Park",
    feature_type: "protected_area",
    latitude: 11.5300,
    longitude: 92.5800,
    properties: {
      region_id: "islands",
      category: "protected_area",
      restriction: "Live coral reef park & sea turtle sanctuary. Strict eco-tourism regulations.",
      allowed_roles: ["*"],
    },
  },
  {
    id: 903,
    name: "Ten Degree Channel Security Sector",
    feature_type: "restricted_area",
    latitude: 10.0000,
    longitude: 92.5000,
    properties: {
      region_id: "islands",
      category: "restricted_area",
      restriction: "Andaman & Nicobar Joint Command surveillance grid.",
      is_restricted: true,
      allowed_roles: ["authority", "disaster_management"],
    },
  },
];

const isRoleAuthorized = (userRole: string, allowedRoles?: string[]) => {
  if (!allowedRoles || allowedRoles.includes("*")) return true;
  if (allowedRoles.includes(userRole)) return true;
  if (userRole === "authority" || userRole === "disaster_management") return true;
  return false;
};

export default function MonitorPage() {
  const { role, getBearerToken } = useAuth();
  const [activeLayer, setActiveLayer] = useState<LayerType>("swell");
  const [selectedDepth, setSelectedDepth] = useState<string>("0m");
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(true);
  const [isPlayingForecast, setIsPlayingForecast] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(9); // Detailed coastal zoom (6 to 14)
  const [showMobileRolePanel, setShowMobileRolePanel] = useState<boolean>(false);
  const [mapSourceMode, setMapSourceMode] = useState<MapSourceMode>("gis");

  // On laptops or screens with constrained dimensions, collapse drawer and layer dock by default to keep UI spacious
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerHeight < 800) {
        setIsSheetExpanded(false);
      }
      if (window.innerWidth < 1024) {
        setIsLayerDockOpen(false);
      }
    }
  }, []);

  // View Scope Mode: "local" (Location-Specific focus) vs "open_world" (Pan-India macro grid)
  const [viewScopeMode, setViewScopeMode] = useState<"local" | "open_world">("local");
  const [selectedSectorId, setSelectedSectorId] = useState<string>("odisha");

  // Active Map Geographic Focus & Search State
  const [mapCenter, setMapCenter] = useState<[number, number]>([19.31, 84.91]);
  const [activeSectorName, setActiveSectorName] = useState<string>("Gopalpur Harbourside & Odisha Coast");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  // Restore user-selected coastal sector and view scope mode across refreshes and page navigations
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedSector = localStorage.getItem("orca_selected_sector");
      const savedScope = localStorage.getItem("orca_view_scope") as "local" | "open_world" | null;

      if (savedScope === "local" || savedScope === "open_world") {
        setViewScopeMode(savedScope);
      }

      if (savedSector) {
        const target = COASTAL_REGIONS.find((r) => r.id === savedSector);
        if (target) {
          setSelectedSectorId(target.id);
          if (savedScope !== "open_world") {
            setMapCenter(target.center);
            setZoomLevel(target.defaultZoom);
            setActiveSectorName(target.name);
          }
        }
      }
    } catch (e) {
      console.warn("Could not restore saved sector from localStorage:", e);
    }
  }, []);

  const handleSectorChange = (newSecId: string) => {
    setSelectedSectorId(newSecId);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("orca_selected_sector", newSecId);
      } catch {}
    }
    const target = COASTAL_REGIONS.find((r) => r.id === newSecId);
    if (target) {
      setMapCenter(target.center);
      setZoomLevel(target.defaultZoom);
      setActiveSectorName(target.name);
      setSelectedFeature(null);
    }
  };

  const handleMapCenterChange = useCallback((newCoords: [number, number]) => {
    setMapCenter(newCoords);
  }, []);

  const activeRegion = useMemo(() => {
    return COASTAL_REGIONS.find((r) => r.id === selectedSectorId) || COASTAL_REGIONS[0];
  }, [selectedSectorId]);

  // Sector Hubs data for Open World macro overview (National clustering)
  const sectorHubs = useMemo<SectorHubData[]>(() => {
    return COASTAL_REGIONS.map((reg) => {
      const count = BASELINE_FEATURES.filter(
        (f) => (f.properties?.region_id || "odisha") === reg.id && isRoleAuthorized(role, f.properties?.allowed_roles)
      ).length;
      return {
        id: reg.id,
        name: reg.name,
        state: reg.state,
        center: reg.center,
        zoom: reg.defaultZoom,
        count: count,
      };
    });
  }, [role]);

  const handleSelectSectorHub = (hub: SectorHubData) => {
    const reg = COASTAL_REGIONS.find((r) => r.id === hub.id);
    if (reg) {
      handleSectorChange(reg.id);
      setViewScopeMode("local");
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("orca_view_scope", "local");
        } catch {}
      }
    }
  };

  // Right-hand layer dock slider state (Collapsible to prevent Windy menu overlap)
  const [isLayerDockOpen, setIsLayerDockOpen] = useState<boolean>(true);

  // Phase 3 GIS Dynamic Map Layers State (Filtered by active role)
  const [layersData, setLayersData] = useState<MapLayersResponse | null>(null);
  const [isLoadingLayers, setIsLoadingLayers] = useState<boolean>(false);
  const [layersError, setLayersError] = useState<string | null>(null);
  const [activeTouristFilter, setActiveTouristFilter] = useState<TouristFilterType>("all");
  const [selectedFeature, setSelectedFeature] = useState<MapFeatureData | null>(null);

  // Fetch role-authorized map features with viewport or region query
  const fetchMapLayers = async (
    zoom: number,
    center: [number, number],
    currentRole: string,
    mode: "local" | "open_world",
    sectorId: string
  ) => {
    setIsLoadingLayers(true);
    setLayersError(null);
    try {
      const token = await getBearerToken();
      let url = "";

      if (mode === "local") {
        url = `${API_BASE_URL}/api/map-layers?region=${sectorId}`;
      } else {
        if (zoom <= 7) {
          url = `${API_BASE_URL}/api/map-layers?bbox=65.0,5.0,96.0,25.0`;
        } else {
          const span = Math.max(1.5, 8.0 / zoom);
          const minLon = +(center[1] - span).toFixed(3);
          const maxLon = +(center[1] + span).toFixed(3);
          const minLat = +(center[0] - span * 0.8).toFixed(3);
          const maxLat = +(center[0] + span * 0.8).toFixed(3);
          url = `${API_BASE_URL}/api/map-layers?bbox=${minLon},${minLat},${maxLon},${maxLat}`;
        }
      }

      const authHeader = token ? `Bearer ${token}` : `Bearer ${currentRole}`;
      const res = await fetch(url, {
        headers: {
          Authorization: authHeader,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load spatial layers (${res.status})`);
      }
      const data: MapLayersResponse = await res.json();
      setLayersData(data);
    } catch (err: any) {
      console.warn("Could not fetch live map layers:", err);
      // Fallback: Filter baseline features strictly by user role and active scope
      let filteredBaseline = BASELINE_FEATURES.filter((f) =>
        isRoleAuthorized(currentRole, f.properties?.allowed_roles)
      );
      if (mode === "local") {
        filteredBaseline = filteredBaseline.filter(
          (f) => (f.properties?.region_id || "odisha") === sectorId
        );
      }
      setLayersData({
        layers: {
          beaches: filteredBaseline.filter((f) => f.feature_type === "beach"),
          pois: filteredBaseline.filter((f) => f.feature_type === "poi"),
          protected_areas: filteredBaseline.filter((f) => f.feature_type === "protected_area"),
          restricted_areas: filteredBaseline.filter((f) => f.feature_type === "restricted_area"),
          risk_zones: filteredBaseline.filter((f) => f.feature_type === "risk_zone"),
          activity_zones: filteredBaseline.filter((f) => f.feature_type === "activity_zone"),
        },
        total_features: filteredBaseline.length,
        requesting_user_role: currentRole,
        data_mode: "baseline_telemetry",
        attribution: "ISRO SAC / INCOIS Baseline",
      });
      setLayersError("Offline/Cached GIS Mode. Showing role-filtered coastal telemetry.");
    } finally {
      setIsLoadingLayers(false);
    }
  };

  useEffect(() => {
    fetchMapLayers(zoomLevel, mapCenter, role, viewScopeMode, selectedSectorId);
  }, [zoomLevel, mapCenter, role, viewScopeMode, selectedSectorId]);

  // Filter features according to active tab and server-enforced role authorization
  const visibleFeatures = useMemo(() => {
    if (!layersData || !layersData.layers) return [];
    let all = [
      ...(layersData.layers.beaches || (layersData.layers as any).beach || []),
      ...(layersData.layers.pois || []),
      ...(layersData.layers.protected_areas || []),
      ...(layersData.layers.restricted_areas || []),
      ...(layersData.layers.activity_zones || []),
      ...(layersData.layers.risk_zones || []),
    ].filter((f) => isRoleAuthorized(role, f.properties?.allowed_roles));

    // Guarantee local scope filtering on client side as well
    if (viewScopeMode === "local") {
      all = all.filter((f) => (f.properties?.region_id || "odisha") === selectedSectorId);
    }

    if (activeTouristFilter === "all") return all;
    if (activeTouristFilter === "beaches") {
      return all.filter((f) => f.feature_type === "beach" || f.feature_type === "poi");
    }
    if (activeTouristFilter === "protected") {
      return all.filter((f) => f.feature_type === "protected_area");
    }
    if (activeTouristFilter === "restricted") {
      return all.filter((f) => f.feature_type === "restricted_area");
    }
    if (activeTouristFilter === "risk") {
      return all.filter((f) => f.feature_type === "risk_zone");
    }
    if (activeTouristFilter === "activity") {
      return all.filter((f) => f.feature_type === "activity_zone");
    }
    return all;
  }, [layersData, activeTouristFilter, role, viewScopeMode, selectedSectorId]);

  // Search Autocomplete Results List
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const combined: SearchLocation[] = [
      ...COASTAL_SECTORS,
      ...visibleFeatures.map((f) => ({
        name: f.name,
        category: "feature" as const,
        lat: f.latitude,
        lon: f.longitude,
        subtitle: `${f.feature_type.replace("_", " ").toUpperCase()} · ${f.latitude.toFixed(2)}°N, ${f.longitude.toFixed(2)}°E`,
        featureId: f.id,
      })),
    ];

    const matches: SearchLocation[] = [];
    const seen = new Set<string>();
    for (const item of combined) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      if (
        key.includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      ) {
        matches.push(item);
        seen.add(key);
      }
      if (matches.length >= 8) break;
    }
    return matches;
  }, [searchQuery, visibleFeatures]);

  const handleSelectLocation = (loc: SearchLocation) => {
    setMapCenter([loc.lat, loc.lon]);
    setActiveSectorName(loc.name);
    setSearchQuery(loc.name);
    setIsSearchFocused(false);
    setZoomLevel((prev) => Math.max(prev, 10));

    // Find matching or nearest coastal region to automatically update sector context
    const targetRegion = COASTAL_REGIONS.find((r) => {
      const dist = Math.hypot(r.center[0] - loc.lat, r.center[1] - loc.lon);
      return dist < 3.0;
    });
    if (targetRegion) {
      setSelectedSectorId(targetRegion.id);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("orca_selected_sector", targetRegion.id);
        } catch {}
      }
    }

    if (loc.featureId) {
      const feat = visibleFeatures.find((f) => f.id === loc.featureId);
      if (feat) setSelectedFeature(feat);
    } else {
      setSelectedFeature(null);
    }
  };

  // Map active layer to Windy overlay parameter
  const windyOverlayParam = useMemo(() => {
    switch (activeLayer) {
      case "swell":
        return "waves";
      case "wind":
        return "wind";
      case "sst":
        return "temp";
      case "radar":
        return "radar";
      case "bathy":
        return "waves";
      default:
        return "waves";
    }
  }, [activeLayer]);

  const currentDepthData = DEPTH_PROFILES[selectedDepth] || DEPTH_PROFILES["0m"];

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-[#071322] select-none">
      {/* Primary Interactive Ocean Map Viewport */}
      <div className="relative flex-1 min-w-0 w-full h-full overflow-hidden bg-[#071322]" id="mapViewport">
        
        {/* ========================================================================= */}
        {/* 1. INTERACTIVE OCEAN MAP (GIS Geo-Locked vs Live Windy Stream)            */}
        {/* ========================================================================= */}
        {mapSourceMode === "gis" ? (
          <OceanLeafletMap
            features={visibleFeatures}
            selectedFeatureId={selectedFeature?.id || null}
            onSelectFeature={(f) => setSelectedFeature(f)}
            activeLayer={activeLayer}
            selectedDepth={selectedDepth}
            centerCoords={mapCenter}
            zoomLevel={zoomLevel}
            onZoomChange={(z) => setZoomLevel(z)}
            onCenterChange={handleMapCenterChange}
            viewScopeMode={viewScopeMode}
            sectorHubs={sectorHubs}
            onSelectSectorHub={handleSelectSectorHub}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <iframe
              key={`windy-${windyOverlayParam}-${zoomLevel}-${mapCenter[0]}-${mapCenter[1]}`}
              src={`https://embed.windy.com/embed.html?lat=${mapCenter[0]}&lon=${mapCenter[1]}&detailLat=${mapCenter[0]}&detailLon=${mapCenter[1]}&width=100%25&height=100%25&zoom=${zoomLevel}&level=surface&overlay=${windyOverlayParam}&product=ecmwf&menu=&message=&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`}
              title="ORCA Live Windy Ocean Telemetry Map"
              className="absolute inset-0 w-full h-full border-0 pointer-events-auto"
              allow="geolocation"
              loading="eager"
            />
            {/* Subtle Marine Radar Sweep Grid Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
              fill="none"
              viewBox="0 0 390 740"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <line stroke="#84f4fa" strokeDasharray="3 3" strokeOpacity="0.15" x1="0" x2="390" y1="210" y2="210" />
              <line stroke="#84f4fa" strokeDasharray="3 3" strokeOpacity="0.15" x1="0" x2="390" y1="440" y2="440" />
              <line stroke="#84f4fa" strokeDasharray="3 3" strokeOpacity="0.12" x1="140" x2="140" y1="0" y2="740" />
              <line stroke="#84f4fa" strokeDasharray="3 3" strokeOpacity="0.12" x1="280" x2="280" y1="0" y2="740" />
            </svg>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. ORCA GIS OVERLAYS & CONTROLS (Floating with pointer-events-none)        */}
        {/* ========================================================================= */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-10">

          {/* Top Scientific Telemetry Bar & Map Search Overlay */}
          <div className="absolute top-2 inset-x-2 sm:top-3 sm:inset-x-3 z-30 flex flex-col gap-1.5 max-w-sm sm:max-w-md lg:max-w-lg mx-auto md:ml-4 pointer-events-auto">
            {/* SatLink Telemetry Pill */}
            <div className="flex items-center justify-between px-3 py-1 rounded-full bg-primary/90 backdrop-blur-md shadow-md text-on-primary border border-white/15">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse shrink-0" />
                <span className="font-label-sm text-[11px] tracking-wider uppercase text-secondary-fixed font-bold font-mono">
                  EOS-06 / Oceansat-3
                </span>
                <span className="font-label-sm text-[11px] text-primary-fixed-dim truncate hidden xs:inline">
                  · {mapCenter[0].toFixed(2)}° N, {mapCenter[1].toFixed(2)}° E
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-label-sm text-[11px] text-secondary-fixed-dim hidden sm:inline truncate max-w-[130px]">
                  {activeSectorName}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-surface-container-high/20 text-inverse-on-surface font-label-sm text-[10px] font-semibold">
                  NavIC LOCKED
                </span>
              </div>
            </div>

            {/* Dual-Scope Viewport Selector & Regional Sector Picker */}
            <div className="flex flex-col gap-1.5 p-1.5 rounded-xl bg-surface-container-lowest/95 backdrop-blur-lg shadow-md border border-white/20 text-xs">
              {/* Row 1: Scope Toggle */}
              <div className="flex items-center gap-1 bg-surface-container-high/40 p-0.5 rounded-lg w-full">
                <button
                  type="button"
                  id="scopeBtnLocation"
                  onClick={() => {
                    setViewScopeMode("local");
                    if (typeof window !== "undefined") {
                      try { localStorage.setItem("orca_view_scope", "local"); } catch {}
                    }
                    const reg = COASTAL_REGIONS.find((r) => r.id === selectedSectorId) || COASTAL_REGIONS[0];
                    setMapCenter(reg.center);
                    setZoomLevel(reg.defaultZoom);
                    setActiveSectorName(reg.name);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md font-mono text-[11px] font-bold transition-all ${
                    viewScopeMode === "local"
                      ? "bg-secondary text-on-secondary shadow-md"
                      : "text-on-surface-variant hover:text-white hover:bg-white/5"
                  }`}
                  title="Location-Specific Mode: Focus strictly on active coastal sector (~5-8 clean pins)"
                >
                  <span className="material-symbols-outlined text-[14px]">my_location</span>
                  <span>Location-Specific</span>
                </button>

                <button
                  type="button"
                  id="scopeBtnOpenWorld"
                  onClick={() => {
                    setViewScopeMode("open_world");
                    if (typeof window !== "undefined") {
                      try { localStorage.setItem("orca_view_scope", "open_world"); } catch {}
                    }
                    setMapCenter([20.0, 78.5]);
                    setZoomLevel(5);
                    setActiveSectorName("Pan-India Coastal Macro Grid (7,516 km)");
                    setSelectedFeature(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md font-mono text-[11px] font-bold transition-all ${
                    viewScopeMode === "open_world"
                      ? "bg-secondary text-on-secondary shadow-md"
                      : "text-on-surface-variant hover:text-white hover:bg-white/5"
                  }`}
                  title="Open World Mode: Macro grid overview across India's entire coastline"
                >
                  <span className="material-symbols-outlined text-[14px]">public</span>
                  <span>Open World</span>
                </button>
              </div>

              {/* Row 2: Regional Sector Dropdown Picker (Visible in Location-Specific mode) */}
              {viewScopeMode === "local" ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/90 text-inverse-on-surface text-xs border border-white/10 w-full">
                  <span className="material-symbols-outlined text-[14px] text-secondary shrink-0">pin_drop</span>
                  <span className="font-mono text-[10px] text-secondary font-bold shrink-0">REGION:</span>
                  <select
                    id="coastalSectorSelect"
                    value={selectedSectorId}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="flex-1 w-full bg-transparent text-inverse-on-surface font-mono font-bold text-[11px] outline-none cursor-pointer"
                  >
                    {COASTAL_REGIONS.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#0b2545] text-white">
                        {r.name} ({r.state})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center justify-between px-2 py-0.5 text-[10px] font-mono text-on-surface-variant font-bold">
                  <span>PAN-INDIA MACRO GRID</span>
                  <span className="text-secondary font-semibold">10 Coastal Sectors</span>
                </div>
              )}
            </div>

            {/* Active Coastal Sector Search Bar with Live Autocomplete */}
            <div className="relative">
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-surface-container-lowest/95 backdrop-blur-lg shadow-lg border border-white/20">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">search</span>
                </div>
                <input
                  className="w-full bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none px-1"
                  placeholder="Search sector, beach, port, sanctuary, or hazard..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults.length > 0) {
                      handleSelectLocation(searchResults[0]);
                    }
                  }}
                />
                {searchQuery && (
                  <button
                    className="flex items-center justify-center w-6 h-6 rounded-full text-on-surface-variant hover:bg-white/10"
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchFocused(false);
                    }}
                    title="Clear Search"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container text-secondary hover:bg-secondary-container transition-colors"
                  title="Reset to Active Sector Center"
                  onClick={() => {
                    const target = COASTAL_REGIONS.find((r) => r.id === selectedSectorId) || COASTAL_REGIONS[0];
                    setMapCenter(target.center);
                    setActiveSectorName(target.name);
                    setSearchQuery("");
                    setZoomLevel(target.defaultZoom);
                    setSelectedFeature(null);
                    setIsSearchFocused(false);
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">my_location</span>
                </button>
                <button
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary transition-colors"
                  title="Refresh Viewport Layers"
                  onClick={() => fetchMapLayers(zoomLevel, mapCenter, role, viewScopeMode, selectedSectorId)}
                >
                  <span className={`material-symbols-outlined text-[18px] ${isLoadingLayers ? "animate-spin" : ""}`}>
                    refresh
                  </span>
                </button>
              </div>

              {/* Autocomplete Dropdown Menu */}
              {isSearchFocused && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl bg-surface-container-lowest/98 backdrop-blur-2xl shadow-2xl border border-white/20 z-50 p-1 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2 py-1 text-[10px] font-mono text-outline uppercase font-semibold">
                    Matching Coastal Sectors & Features ({searchResults.length})
                  </div>
                  {searchResults.map((loc, idx) => (
                    <button
                      key={`${loc.name}-${idx}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectLocation(loc);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-surface-container flex items-center justify-between gap-2 group transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-secondary shrink-0">
                          {loc.category === "beach"
                            ? "beach_access"
                            : loc.category === "sanctuary"
                            ? "shield_with_heart"
                            : loc.category === "port"
                            ? "directions_boat"
                            : loc.category === "hazard"
                            ? "warning"
                            : "location_on"}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-xs text-primary truncate group-hover:text-secondary-fixed">
                            {loc.name}
                          </span>
                          <span className="text-[10px] text-on-surface-variant truncate">
                            {loc.subtitle}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-outline shrink-0">
                        {loc.lat.toFixed(2)}°, {loc.lon.toFixed(2)}°
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Clearance & Access Badge */}
            <div className="flex items-center justify-between gap-1 overflow-x-auto pb-0.5 no-scrollbar select-none text-[11px]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-md border border-white/10 text-inverse-on-surface shadow">
                <span className="material-symbols-outlined text-[14px] text-secondary">
                  {role === "authority" || role === "disaster_management" ? "verified_user" : "public"}
                </span>
                <span className="font-bold uppercase text-secondary-fixed font-mono">{role}</span>
                <span className="text-surface-variant text-[10px] hidden sm:inline font-mono">
                  {role === "authority" || role === "disaster_management"
                    ? "· Defense Grid Unlocked"
                    : "· Defense Grid Redacted"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-secondary-fixed bg-surface-container-high/40 px-2 py-0.5 rounded-full border border-white/10">
                {visibleFeatures.length} Features
              </div>
            </div>

            {/* Phase 3 Tourist GIS Layer Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar select-none">
              {[
                { id: "all", label: `All Layers (${visibleFeatures.length})`, icon: "layers" },
                { id: "beaches", label: "Beaches & POIs", icon: "beach_access" },
                { id: "protected", label: "Protected Sanctuaries", icon: "shield_with_heart" },
                { id: "restricted", label: "Restricted Channels", icon: "gavel" },
                { id: "risk", label: "Surge & Breakers", icon: "warning" },
                { id: "activity", label: "Water Sports", icon: "surfing" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTouristFilter(tab.id as TouristFilterType)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide whitespace-nowrap backdrop-blur-md shadow transition-all ${
                    activeTouristFilter === tab.id
                      ? "bg-secondary text-on-secondary font-semibold scale-100 shadow-md"
                      : "bg-primary/85 hover:bg-primary/95 text-inverse-on-surface/90 border border-white/10"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Loading or Error Banners */}
            {isLoadingLayers && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary-container/90 text-on-secondary-container text-xs backdrop-blur-md animate-pulse">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                <span>Syncing PostGIS Viewport Features (Role: {role})...</span>
              </div>
            )}

            {layersError && (
              <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-error-container/95 text-on-error-container text-xs backdrop-blur-md">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">cloud_off</span>
                  <span>{layersError}</span>
                </div>
                <button
                  onClick={() => fetchMapLayers(zoomLevel, mapCenter, role, viewScopeMode, selectedSectorId)}
                  className="underline font-bold hover:text-white"
                >
                  Retry
                </button>
              </div>
            )}
          </div>

          {/* Right-Aligned Collapsible Layer Dock Slider (Tuck away to prevent Windy menu overlap) */}
          <div
            className={`absolute right-3 top-28 sm:top-36 z-30 flex items-start transition-transform duration-300 ease-in-out pointer-events-auto ${
              isLayerDockOpen ? "translate-x-0" : "translate-x-[calc(100%-2.2rem)]"
            }`}
            id="layerDockSlider"
          >
            {/* Sleek Toggle Pull-Tab Button */}
            <button
              onClick={() => setIsLayerDockOpen(!isLayerDockOpen)}
              className="flex items-center justify-center w-8 h-10 rounded-l-xl bg-primary/95 text-secondary-fixed hover:bg-primary shadow-xl border-y border-l border-white/20 active:scale-95 transition-all mt-1"
              title={isLayerDockOpen ? "Collapse Layer Options (Avoid Windy Menu Overlap)" : "Expand Layer Options"}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isLayerDockOpen ? "chevron_right" : "tune"}
              </span>
            </button>

            {/* Layer Controls Column */}
            <div className="flex flex-col gap-1.5 items-end pl-1 bg-surface-container-lowest/60 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none p-1 sm:p-0 rounded-2xl">
              {/* Live Map Mode Switcher (GIS Geo-Locked vs Live Windy Stream) */}
              <button
                onClick={() => setMapSourceMode((m) => (m === "gis" ? "windy" : "gis"))}
                className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 mb-1 rounded-full shadow-md font-bold text-[11px] font-mono tracking-wide transition-all active:scale-95 ${
                  mapSourceMode === "gis"
                    ? "bg-secondary text-on-secondary shadow-lg"
                    : "bg-primary/95 text-secondary-fixed border border-secondary/40"
                }`}
                title="Toggle between Geo-Locked PostGIS Map and Live Animated Windy Stream"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {mapSourceMode === "gis" ? "travel_explore" : "cyclone"}
                </span>
                <span>{mapSourceMode === "gis" ? "GIS Geo-Locked" : "Live Windy Stream"}</span>
              </button>

              <button
                onClick={() => setActiveLayer("swell")}
                className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
                  activeLayer === "swell"
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "bg-primary/85 hover:bg-primary text-inverse-on-surface border border-white/10"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">tsunami</span>
                <span className="font-label-sm text-label-sm">Swell 2.8m</span>
              </button>

              <button
                onClick={() => setActiveLayer("wind")}
                className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
                  activeLayer === "wind"
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "bg-primary/85 hover:bg-primary text-inverse-on-surface border border-white/10"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-secondary-fixed">air</span>
                <span className="font-label-sm text-label-sm">Wind 18kts</span>
              </button>

              <button
                onClick={() => setActiveLayer("sst")}
                className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
                  activeLayer === "sst"
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "bg-primary/85 hover:bg-primary text-inverse-on-surface border border-white/10"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">thermostat</span>
                <span className="font-label-sm text-label-sm">SST 29.4°C</span>
              </button>

              <button
                onClick={() => setActiveLayer("radar")}
                className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
                  activeLayer === "radar"
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "bg-primary/85 hover:bg-primary text-inverse-on-surface border border-white/10"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim">radar</span>
                <span className="font-label-sm text-label-sm">Radar</span>
              </button>

              <button
                onClick={() => setActiveLayer("bathy")}
                className={`layer-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md transition-all active:scale-95 ${
                  activeLayer === "bathy"
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "bg-primary/85 hover:bg-primary text-inverse-on-surface border border-white/10"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-secondary-fixed-dim">water</span>
                <span className="font-label-sm text-label-sm">Bathymetry</span>
              </button>

              {/* Multi-Depth Selector Control (0m, -10m, -50m) */}
              <div className="mt-1 flex flex-col items-center bg-primary/90 backdrop-blur-md rounded-xl p-1 shadow-md text-inverse-on-surface border border-white/10">
                <span className="font-label-sm text-label-sm text-secondary-fixed-dim px-1.5 py-0.5 text-[10px] font-mono font-bold">
                  DEPTH
                </span>
                {["0m", "-10m", "-50m"].map((depth) => (
                  <button
                    key={depth}
                    onClick={() => setSelectedDepth(depth)}
                    className={`w-8 h-5 rounded font-label-sm text-[11px] font-semibold transition-colors ${
                      selectedDepth === depth
                        ? "bg-secondary text-on-secondary"
                        : "text-surface-variant hover:text-white"
                    }`}
                  >
                    {depth}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Left-Aligned Interactive Zoom Controls */}
          <div className="absolute left-3 top-36 z-30 flex flex-col gap-2 pointer-events-auto">
            <div className="flex flex-col rounded-xl bg-primary/90 backdrop-blur-md shadow-md border border-white/15 overflow-hidden text-inverse-on-surface">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 1, 11))}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/10 active:bg-secondary active:text-on-secondary transition-colors"
                title="Zoom In"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
              <div className="h-[1px] bg-white/15 w-full" />
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 1, 6))}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/10 active:bg-secondary active:text-on-secondary transition-colors"
                title="Zoom Out"
              >
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
            <button
              onClick={() => {
                if (viewScopeMode === "open_world") {
                  setMapCenter([20.0, 78.5]);
                  setZoomLevel(5);
                  setActiveSectorName("Pan-India Coastal Macro Grid (7,516 km)");
                } else {
                  const target = COASTAL_REGIONS.find((r) => r.id === selectedSectorId) || COASTAL_REGIONS[0];
                  setMapCenter(target.center);
                  setActiveSectorName(target.name);
                  setZoomLevel(target.defaultZoom);
                }
                setSelectedFeature(null);
              }}
              className="w-9 h-9 rounded-xl bg-primary/90 backdrop-blur-md shadow-md border border-white/15 flex items-center justify-center text-secondary-fixed hover:bg-white/10 active:scale-95 transition-all"
              title="Reset View to Current Scope"
            >
              <span className="material-symbols-outlined text-[20px]">explore</span>
            </button>
          </div>

          {/* Windy Mode Informational HUD Banner */}
          {mapSourceMode === "windy" && (
            <div className="absolute top-24 left-3 right-14 sm:left-auto sm:right-16 z-20 flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-primary/95 text-on-primary text-xs backdrop-blur-md border border-secondary/30 shadow-lg pointer-events-auto max-w-md">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[16px] text-secondary animate-spin">cyclone</span>
                <span className="truncate text-[11px] font-mono">Live Windy ECMWF Stream · Geo-Pin Locked</span>
              </div>
              <button
                onClick={() => setMapSourceMode("gis")}
                className="px-2 py-0.5 rounded bg-secondary text-on-secondary font-semibold font-mono text-[10px] shrink-0 hover:bg-secondary/90 transition-colors"
              >
                Switch to GIS
              </button>
            </div>
          )}

          {/* Selected Feature Detail Modal Card */}
          {selectedFeature && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-50 w-[90%] sm:w-84 p-4 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl shadow-2xl border border-white/40 text-on-surface animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-surface-container">
                <div className="flex flex-col min-w-0">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-secondary">
                    <span className="material-symbols-outlined text-[12px]">explore</span>
                    {selectedFeature.feature_type.replace("_", " ")}
                    <span className="px-1 py-0.2 rounded bg-surface-container text-on-surface-variant font-mono">
                      DEMO
                    </span>
                  </span>
                  <h4 className="font-headline-sm text-headline-sm text-primary font-bold truncate leading-tight mt-0.5">
                    {selectedFeature.name}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="w-7 h-7 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div className="py-2.5 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px]">
                  <span>Coordinates:</span>
                  <span>{selectedFeature.latitude.toFixed(4)}°N, {selectedFeature.longitude.toFixed(4)}°E</span>
                </div>

                {selectedFeature.properties?.patrol_status && (
                  <div className="p-2 rounded-lg bg-secondary-container/40 text-on-secondary-container flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">verified_user</span>
                    <span>{selectedFeature.properties.patrol_status}</span>
                  </div>
                )}

                {selectedFeature.properties?.warning && (
                  <div className="p-2 rounded-lg bg-error-container/40 text-on-error-container flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-error mt-0.5">warning</span>
                    <span className="font-semibold">{selectedFeature.properties.warning}</span>
                  </div>
                )}

                {selectedFeature.properties?.restriction && (
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-amber-500 mt-0.5">info</span>
                    <span>{selectedFeature.properties.restriction}</span>
                  </div>
                )}

                {selectedFeature.properties?.caution_notes && (
                  <p className="text-on-surface-variant italic">
                    Note: {selectedFeature.properties.caution_notes}
                  </p>
                )}

                {selectedFeature.properties?.amenities && selectedFeature.properties.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedFeature.properties.amenities.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface text-[10px] font-mono"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Action Button to consult AI Suitability */}
              <div className="pt-2 border-t border-surface-container flex gap-2">
                <Link
                  href={`/chat?query=Is it safe to visit ${encodeURIComponent(selectedFeature.name)} today?`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-all"
                >
                  <span className="material-symbols-outlined text-[15px] text-secondary-fixed">psychology</span>
                  <span>Evaluate Suitability</span>
                </Link>
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div
            className="absolute left-3 bottom-24 z-20 hidden sm:flex flex-col gap-1 p-2.5 rounded-xl bg-primary/90 backdrop-blur-md text-inverse-on-surface shadow-md border border-white/10 pointer-events-auto"
            id="mapLegend"
          >
            <span className="text-[10px] font-mono uppercase font-bold text-secondary tracking-wider pb-0.5 border-b border-white/10">
              GIS Layer Legend
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="font-label-sm text-[11px] text-surface-variant font-mono">Beaches & Coastal POIs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-label-sm text-[11px] text-surface-variant font-mono">Marine Sanctuaries</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
              <span className="font-label-sm text-[11px] text-surface-variant font-mono">Port Channels (Restricted)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-label-sm text-[11px] text-surface-variant font-mono">Breaker Hazards (L3 Surge)</span>
            </div>
          </div>

          {/* Mobile Persona Telemetry Button */}
          <button
            onClick={() => setShowMobileRolePanel(true)}
            className="lg:hidden absolute left-3 bottom-14 sm:bottom-20 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/95 text-on-primary shadow-lg backdrop-blur-md border border-white/20 text-[11px] font-mono font-bold uppercase hover:bg-primary pointer-events-auto"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">dashboard_customize</span>
            <span>{role} Telemetry</span>
          </button>

          {/* Floating Pull-up / Collapsible Telemetry Drawer Sheet */}
          <div
            className="absolute inset-x-2 bottom-2 sm:inset-x-3 z-40 flex flex-col rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out border border-white/40 max-w-sm sm:max-w-md lg:max-w-lg mx-auto md:ml-4 pointer-events-auto"
            id="telemetrySheet"
          >
            {/* Drag Handle & Collapsible Header Toggle */}
            <div
              onClick={() => setIsSheetExpanded(!isSheetExpanded)}
              className="flex flex-col px-4 pt-2.5 pb-2 bg-surface-container-low/80 cursor-pointer hover:bg-surface-container-low transition-colors select-none active:bg-surface-container"
              id="sheetToggleHandle"
            >
              <div className="flex items-center justify-center gap-1 w-full py-0.5 mb-1.5">
                <div className="w-12 h-1.5 rounded-full bg-outline-variant/80 hover:bg-secondary transition-colors" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-headline-sm text-headline-sm text-primary leading-snug truncate font-bold">
                        {activeRegion.buoyStation}
                      </span>
                      {!isSheetExpanded && (
                        <span className="font-label-sm text-[11px] text-secondary font-semibold bg-secondary-container/50 px-1.5 py-0.2 rounded">
                          {currentDepthData.indicator}
                        </span>
                      )}
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                      {activeRegion.name} · {currentDepthData.sublabel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full ${currentDepthData.statusColor} font-label-sm text-label-sm font-semibold tracking-wide uppercase shrink-0`}>
                    {currentDepthData.status}
                  </span>
                  <button
                    className="w-8 h-8 rounded-full bg-surface-container hover:bg-secondary-container flex items-center justify-center text-primary transition-all ml-1"
                    type="button"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                        isSheetExpanded ? "rotate-0" : "rotate-180"
                      }`}
                    >
                      keyboard_arrow_down
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Body */}
            {isSheetExpanded && (
              <div className="flex flex-col transition-all duration-300 ease-in-out opacity-100 max-h-[500px] overflow-y-auto">
                {/* Linear Metrics Row */}
                <div className="grid grid-cols-4 gap-1 p-3 bg-surface-container-lowest">
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      {currentDepthData.metric1.name}
                    </span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {currentDepthData.metric1.value}
                      </span>
                      <span className="font-label-sm text-label-sm text-primary">
                        {currentDepthData.metric1.unit}
                      </span>
                    </div>
                    <span className={`font-label-sm text-label-sm font-semibold font-mono ${currentDepthData.metric1.color || "text-secondary"}`}>
                      {currentDepthData.metric1.sub}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      {currentDepthData.metric2.name}
                    </span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {currentDepthData.metric2.value}
                      </span>
                      <span className="font-label-sm text-label-sm text-primary">
                        {currentDepthData.metric2.unit}
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      {currentDepthData.metric2.sub}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      {currentDepthData.metric3.name}
                    </span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {currentDepthData.metric3.value}
                      </span>
                      <span className="font-label-sm text-label-sm text-primary">
                        {currentDepthData.metric3.unit}
                      </span>
                    </div>
                    <span className={`font-label-sm text-label-sm font-semibold ${currentDepthData.metric3.color || "text-secondary"}`}>
                      {currentDepthData.metric3.sub}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-surface-container-low text-center">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                      {currentDepthData.metric4.name}
                    </span>
                    <div className="flex items-baseline gap-0.5 mt-0.5">
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {currentDepthData.metric4.value}
                      </span>
                      <span className="font-label-sm text-label-sm text-primary">
                        {currentDepthData.metric4.unit}
                      </span>
                    </div>
                    <span className={`font-label-sm text-label-sm font-semibold font-mono ${currentDepthData.metric4.color || "text-secondary"}`}>
                      {currentDepthData.metric4.sub}
                    </span>
                  </div>
                </div>

                {/* Windy-Style 24h Ocean Scrubber Slider */}
                <div className="flex flex-col px-3 py-2 bg-surface-container-low/50 border-t border-surface-container/60">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setIsPlayingForecast(!isPlayingForecast)}
                        className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isPlayingForecast ? "pause" : "play_arrow"}
                        </span>
                      </button>
                      <span className="font-label-sm text-label-sm font-semibold text-primary">
                        24h Swell Prediction
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      Now (14:30 IST)
                    </span>
                  </div>
                  <div className="relative w-full flex items-center h-5">
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden relative">
                      <div
                        className={`h-full bg-secondary rounded-full transition-all duration-300 ${
                          isPlayingForecast ? "w-3/4" : "w-1/4"
                        }`}
                      />
                    </div>
                    <div
                      className={`absolute -ml-2 w-4 h-4 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center cursor-pointer transition-all duration-300 ${
                        isPlayingForecast ? "left-3/4" : "left-1/4"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                    </div>
                  </div>
                  <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant mt-0.5 font-mono">
                    <span className="text-primary font-bold">Now</span>
                    <span>+6h</span>
                    <span>+12h</span>
                    <span>+18h</span>
                    <span>+24h (Tomorrow)</span>
                  </div>
                </div>

                {/* Action Triggers: AI Advisory + SOS Broadcast */}
                <div className="flex items-center gap-2 p-3 bg-surface-container-lowest border-t border-surface-container/60">
                  <Link
                    href="/chat"
                    className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container active:scale-[0.98] transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-[20px] text-secondary-fixed">
                      auto_awesome
                    </span>
                    <span className="font-body-md text-body-md font-semibold">
                      Ask ORCA Advisory
                    </span>
                  </Link>
                  <Link
                    href="/alerts"
                    className="flex items-center justify-center gap-1.5 px-4 h-11 rounded-xl bg-tertiary-container text-on-tertiary font-body-md text-body-md font-semibold hover:bg-tertiary active:scale-[0.98] transition-all shadow-md"
                    title="Broadcast Coast Guard Mayday"
                  >
                    <span className="material-symbols-outlined text-[20px] animate-pulse">sos</span>
                    <span>SOS</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clear Layout Space on Desktop Alongside Map for Role-Aware Widgets */}
      <aside className="hidden lg:flex flex-col w-96 h-full bg-surface-container-lowest border-l border-surface-container p-4 overflow-y-auto z-20 shrink-0">
        <RoleWidgetPanel role={role} />
      </aside>

      {/* Mobile Drawer for Role Telemetry */}
      {showMobileRolePanel && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-t-2xl max-h-[80vh] overflow-y-auto p-4 border-t border-surface-container shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-primary font-mono font-bold uppercase">
                  {role} Telemetry Panel
                </span>
              </div>
              <button
                onClick={() => setShowMobileRolePanel(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <RoleWidgetPanel role={role} />
          </div>
        </div>
      )}
    </div>
  );
}
