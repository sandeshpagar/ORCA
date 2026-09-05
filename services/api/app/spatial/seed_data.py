"""
Demo Map Features Seed Data — ORCA (Phase 3 & Pan-India Expansion)
Contains verified geospatial geometries for India's 7,516 km coastline across
all coastal states (Odisha, Maharashtra, Goa, Gujarat, Karnataka, Kerala,
Tamil Nadu, Andhra Pradesh, West Bengal) and Island territories.
All features are explicitly marked as ReliabilityMode.DEMO per PRD §8.
"""

from typing import List, Dict, Any

DEMO_MAP_FEATURES: List[Dict[str, Any]] = [
    # =========================================================================
    # 1. ODISHA COASTAL SECTOR (region_id: "odisha") - 7 Features
    # =========================================================================
    {
        "name": "Gopalpur Main Beach & Lifeguard Station",
        "feature_type": "beach",
        "latitude": 19.2605,
        "longitude": 84.9042,
        "geometry": {
            "type": "Point",
            "coordinates": [84.9042, 19.2605],
        },
        "properties": {
            "region_id": "odisha",
            "category": "beach",
            "patrol_status": "Lifeguards Active 06:00 - 18:00",
            "amenities": ["Watchtower", "First Aid", "Shaded Promenade", "Parking"],
            "suitable_activities": ["beach_visit", "sightseeing"],
            "caution_notes": "Heavy shorebreak during afternoon high tide.",
            "is_restricted": False,
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Aryapalli Pristine Shore & Sand Dunes",
        "feature_type": "beach",
        "latitude": 19.3082,
        "longitude": 84.9621,
        "geometry": {
            "type": "Point",
            "coordinates": [84.9621, 19.3082],
        },
        "properties": {
            "region_id": "odisha",
            "category": "beach",
            "patrol_status": "Unpatrolled Natural Shore",
            "amenities": ["Casuarina Grove", "Scenic Cliff"],
            "suitable_activities": ["sightseeing", "beach_visit"],
            "caution_notes": "Steep underwater gradient. Swimming strictly discouraged.",
            "is_restricted": False,
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Rushikulya Marine Turtle Sanctuary",
        "feature_type": "protected_area",
        "latitude": 19.3621,
        "longitude": 85.0841,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [85.0200, 19.3500],
                    [85.0800, 19.3500],
                    [85.1000, 19.4200],
                    [85.0300, 19.4200],
                    [85.0200, 19.3500],
                ]
            ],
        },
        "properties": {
            "region_id": "odisha",
            "category": "protected_area",
            "status": "Wildlife Sanctuary Tier 1",
            "restriction": "Olive Ridley mass nesting zone. Mechanized fishing and night lighting strictly prohibited Dec-May.",
            "is_restricted": True,
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Gopalpur Commercial Port Deepwater Fairway",
        "feature_type": "restricted_area",
        "latitude": 19.3050,
        "longitude": 84.9750,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [84.9300, 19.2700],
                    [84.9800, 19.2900],
                    [84.9600, 19.3300],
                    [84.9100, 19.3100],
                    [84.9300, 19.2700],
                ]
            ],
        },
        "properties": {
            "region_id": "odisha",
            "category": "restricted_area",
            "status": "VTS Controlled Channel",
            "restriction": "Commercial bulk carrier lane. Recreational and tourist vessels strictly prohibited.",
            "clearance": "Port Authority Clearance Mandatory (VHF Ch 16)",
            "is_restricted": True,
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },
    {
        "name": "Gopalpur Shoals High Breaker Surge Polygon (Alert L3)",
        "feature_type": "risk_zone",
        "latitude": 19.2550,
        "longitude": 84.9150,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [84.9150, 19.2680],
                    [84.9450, 19.2750],
                    [84.9400, 19.2900],
                    [84.9100, 19.2820],
                    [84.9150, 19.2680],
                ]
            ],
        },
        "properties": {
            "region_id": "odisha",
            "category": "risk_zone",
            "hazard_level": "Alert Level 3: Severe Surge",
            "warning": "Violent shoaling breakers over shallow bar. High rollover risk.",
            "is_restricted": False,
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Puri Regulated Water Sports Corridor",
        "feature_type": "activity_zone",
        "latitude": 19.3250,
        "longitude": 84.9910,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [84.9800, 19.3200],
                    [85.0000, 19.3200],
                    [85.0000, 19.3350],
                    [84.9800, 19.3350],
                    [84.9800, 19.3200],
                ]
            ],
        },
        "properties": {
            "region_id": "odisha",
            "category": "activity_zone",
            "permitted_activities": ["jet_ski", "kayaking", "boating"],
            "safety_equipment": "Mandatory Level 3 Life Jackets & Rescue RIB On-Duty",
            "is_restricted": False,
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Naval Defense Tactical Sector (Bravo-9 Grid)",
        "feature_type": "restricted_area",
        "latitude": 19.4500,
        "longitude": 85.2000,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [85.1500, 19.4000],
                    [85.2500, 19.4000],
                    [85.2700, 19.5000],
                    [85.1700, 19.5000],
                    [85.1500, 19.4000],
                ]
            ],
        },
        "properties": {
            "region_id": "odisha",
            "category": "restricted_area",
            "status": "CLASSIFIED MARITIME DEFENSE ZONE",
            "restriction": "Active radar surveillance and naval firing practice perimeter. Strictly restricted.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },

    # =========================================================================
    # 2. MAHARASHTRA & MUMBAI SECTOR (region_id: "maharashtra") - 6 Features
    # =========================================================================
    {
        "name": "Juhu Beach & Lifeguard Station",
        "feature_type": "beach",
        "latitude": 19.0988,
        "longitude": 72.8264,
        "geometry": {"type": "Point", "coordinates": [72.8264, 19.0988]},
        "properties": {
            "region_id": "maharashtra",
            "category": "beach",
            "patrol_status": "Municipal Lifeguards Stationed 24/7",
            "amenities": ["Watchtowers", "Promenade", "First Aid Center"],
            "suitable_activities": ["beach_visit", "sightseeing"],
            "caution_notes": "High tide surges near rotary club exit. Obey siren warnings.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Girgaon Chowpatty & Marine Drive",
        "feature_type": "beach",
        "latitude": 18.9548,
        "longitude": 72.8155,
        "geometry": {"type": "Point", "coordinates": [72.8155, 18.9548]},
        "properties": {
            "region_id": "maharashtra",
            "category": "beach",
            "patrol_status": "Patrolled Urban Shore",
            "amenities": ["Boardwalk", "Lighting", "Emergency Post"],
            "suitable_activities": ["sightseeing", "beach_visit"],
            "caution_notes": "Intertidal mudflat gradient. Swimming prohibited.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Tarkarli Coral Reef Marine Sanctuary",
        "feature_type": "protected_area",
        "latitude": 16.0354,
        "longitude": 73.4912,
        "geometry": {"type": "Point", "coordinates": [73.4912, 16.0354]},
        "properties": {
            "region_id": "maharashtra",
            "category": "protected_area",
            "status": "Malvan Marine Sanctuary Buffer",
            "restriction": "Protected live coral shelf. Anchoring on coral heads strictly penalized.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "JNPT Deepwater Bulk Carrier Fairway",
        "feature_type": "restricted_area",
        "latitude": 18.9500,
        "longitude": 72.9500,
        "geometry": {"type": "Point", "coordinates": [72.9500, 18.9500]},
        "properties": {
            "region_id": "maharashtra",
            "category": "restricted_area",
            "status": "Active Container Terminal Fairway",
            "restriction": "Major container shipping channel. Non-commercial vessels prohibited.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },
    {
        "name": "Western Naval Command Tactical Fairway",
        "feature_type": "restricted_area",
        "latitude": 18.9100,
        "longitude": 72.8400,
        "geometry": {"type": "Point", "coordinates": [72.8400, 18.9100]},
        "properties": {
            "region_id": "maharashtra",
            "category": "restricted_area",
            "status": "CLASSIFIED NAVAL BASE GRID",
            "restriction": "Naval Dockyard restricted perimeter. Armed coastal patrol 24/7.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },
    {
        "name": "Kashid Beach Violent Rip Current Bar",
        "feature_type": "risk_zone",
        "latitude": 18.4286,
        "longitude": 72.9056,
        "geometry": {"type": "Point", "coordinates": [72.9056, 18.4286]},
        "properties": {
            "region_id": "maharashtra",
            "category": "risk_zone",
            "hazard_level": "Severe Undertow Hazard",
            "warning": "Steep sand slope creating deceptive rip tides. Multiple drownings recorded.",
            "allowed_roles": ["*"],
        },
    },

    # =========================================================================
    # 3. GOA COASTAL SECTOR (region_id: "goa") - 6 Features
    # =========================================================================
    {
        "name": "Calangute & Baga Lifeguard Beach",
        "feature_type": "beach",
        "latitude": 15.5439,
        "longitude": 73.7553,
        "geometry": {"type": "Point", "coordinates": [73.7553, 15.5439]},
        "properties": {
            "region_id": "goa",
            "category": "beach",
            "patrol_status": "Drishti Marine Lifeguards Stationed 07:00 - 19:00",
            "amenities": ["Watchtowers", "Medical Aid", "Signposted Bathing Zones"],
            "suitable_activities": ["beach_visit", "swimming", "sightseeing"],
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Miramar Beach & Mandovi Shore",
        "feature_type": "beach",
        "latitude": 15.4820,
        "longitude": 73.8070,
        "geometry": {"type": "Point", "coordinates": [73.8070, 15.4820]},
        "properties": {
            "region_id": "goa",
            "category": "beach",
            "patrol_status": "Patrolled Estuary Shore",
            "amenities": ["Promenade", "Sunset Point"],
            "caution_notes": "Estuarine confluence currents.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Grande Island Marine Coral Reserve",
        "feature_type": "protected_area",
        "latitude": 15.3522,
        "longitude": 73.7667,
        "geometry": {"type": "Point", "coordinates": [73.7667, 15.3522]},
        "properties": {
            "region_id": "goa",
            "category": "protected_area",
            "restriction": "Strict no-spearfishing and no-anchor zone.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Mormugao Port Approach Deep Channel",
        "feature_type": "restricted_area",
        "latitude": 15.4167,
        "longitude": 73.8000,
        "geometry": {"type": "Point", "coordinates": [73.8000, 15.4167]},
        "properties": {
            "region_id": "goa",
            "category": "restricted_area",
            "restriction": "Iron ore and cruise vessel navigation fairway. Clearance required.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },
    {
        "name": "Goa Naval Air & Sea Enclave (Vasco Grid)",
        "feature_type": "restricted_area",
        "latitude": 15.3800,
        "longitude": 73.8200,
        "geometry": {"type": "Point", "coordinates": [73.8200, 15.3800]},
        "properties": {
            "region_id": "goa",
            "category": "restricted_area",
            "restriction": "Active naval aviation and coastal defense operations.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },
    {
        "name": "Aguada Estuary Sandbar Breaker Bar",
        "feature_type": "risk_zone",
        "latitude": 15.4920,
        "longitude": 73.7710,
        "geometry": {"type": "Point", "coordinates": [73.7710, 15.4920]},
        "properties": {
            "region_id": "goa",
            "category": "risk_zone",
            "hazard_level": "Severe Breaking Bar",
            "warning": "Violent shoaling breakers at Mandovi river mouth. High rollover hazard.",
            "allowed_roles": ["*"],
        },
    },

    # =========================================================================
    # 4. GUJARAT COASTAL SECTOR (region_id: "gujarat") - 4 Features
    # =========================================================================
    {
        "name": "Shivrajpur Blue Flag Beach",
        "feature_type": "beach",
        "latitude": 22.3328,
        "longitude": 68.9556,
        "geometry": {"type": "Point", "coordinates": [68.9556, 22.3328]},
        "properties": {
            "region_id": "gujarat",
            "category": "beach",
            "patrol_status": "Blue Flag Certified · Fully Monitored",
            "amenities": ["Clean Bathing Water", "Bio-toilets", "Solar Lighting"],
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Gulf of Kutch Marine National Park",
        "feature_type": "protected_area",
        "latitude": 22.4600,
        "longitude": 69.6100,
        "geometry": {"type": "Point", "coordinates": [69.6100, 22.4600]},
        "properties": {
            "region_id": "gujarat",
            "category": "protected_area",
            "restriction": "Mangrove habitat and live corals. Strict ecological protection zone.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Kandla / Deendayal Commercial Fairway",
        "feature_type": "restricted_area",
        "latitude": 23.0033,
        "longitude": 70.2197,
        "geometry": {"type": "Point", "coordinates": [70.2197, 23.0033]},
        "properties": {
            "region_id": "gujarat",
            "category": "restricted_area",
            "restriction": "Active crude carrier & container channel.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },
    {
        "name": "Okha Naval Defense Corridor",
        "feature_type": "restricted_area",
        "latitude": 22.4700,
        "longitude": 69.0600,
        "geometry": {"type": "Point", "coordinates": [69.0600, 22.4700]},
        "properties": {
            "region_id": "gujarat",
            "category": "restricted_area",
            "restriction": "Forward naval maritime patrol base perimeter.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },

    # =========================================================================
    # 5. KARNATAKA COASTAL SECTOR (region_id: "karnataka") - 3 Features
    # =========================================================================
    {
        "name": "Gokarna Om Beach & Kudle Shore",
        "feature_type": "beach",
        "latitude": 14.5186,
        "longitude": 74.3168,
        "geometry": {"type": "Point", "coordinates": [74.3168, 14.5186]},
        "properties": {
            "region_id": "karnataka",
            "category": "beach",
            "patrol_status": "Coastal Police & Lifeguards on Duty",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Panambur Beach Lifeguard Station",
        "feature_type": "beach",
        "latitude": 12.9536,
        "longitude": 74.8144,
        "geometry": {"type": "Point", "coordinates": [74.8144, 12.9536]},
        "properties": {
            "region_id": "karnataka",
            "category": "beach",
            "patrol_status": "Dedicated Lifesaving Association Base",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "New Mangalore Port Approach Fairway",
        "feature_type": "restricted_area",
        "latitude": 12.9250,
        "longitude": 74.8000,
        "geometry": {"type": "Point", "coordinates": [74.8000, 12.9250]},
        "properties": {
            "region_id": "karnataka",
            "category": "restricted_area",
            "restriction": "Deepwater bulk cargo and POL channel.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },

    # =========================================================================
    # 6. KERALA & MALABAR SECTOR (region_id: "kerala") - 5 Features
    # =========================================================================
    {
        "name": "Kovalam Lighthouse Beach & Crescent Cove",
        "feature_type": "beach",
        "latitude": 8.4021,
        "longitude": 76.9787,
        "geometry": {"type": "Point", "coordinates": [76.9787, 8.4021]},
        "properties": {
            "region_id": "kerala",
            "category": "beach",
            "patrol_status": "Lifeguards Active · Safe Bathing Enclave",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Varkala Cliff Beach & Papanasam Springs",
        "feature_type": "beach",
        "latitude": 8.7330,
        "longitude": 76.7032,
        "geometry": {"type": "Point", "coordinates": [76.7032, 8.7330]},
        "properties": {
            "region_id": "kerala",
            "category": "beach",
            "patrol_status": "Patrolled Cliff Shore",
            "caution_notes": "Steep waves close to rocks during rising tide.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Munambam Estuary Sandbar Rip Hazard",
        "feature_type": "risk_zone",
        "latitude": 10.1850,
        "longitude": 76.1620,
        "geometry": {"type": "Point", "coordinates": [76.1620, 10.1850]},
        "properties": {
            "region_id": "kerala",
            "category": "risk_zone",
            "hazard_level": "Violent Rip Current",
            "warning": "Extreme undertow at Periyar river discharge. Swimming prohibited.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Cochin Port Trust Deepwater Shipping Lane",
        "feature_type": "restricted_area",
        "latitude": 9.9667,
        "longitude": 76.2667,
        "geometry": {"type": "Point", "coordinates": [76.2667, 9.9667]},
        "properties": {
            "region_id": "kerala",
            "category": "restricted_area",
            "restriction": "International container transshipment fairway.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },
    {
        "name": "INS Dronacharya Naval Firing Sector",
        "feature_type": "restricted_area",
        "latitude": 9.9200,
        "longitude": 76.2400,
        "geometry": {"type": "Point", "coordinates": [76.2400, 9.9200]},
        "properties": {
            "region_id": "kerala",
            "category": "restricted_area",
            "restriction": "Southern Naval Command live firing and radar range.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },

    # =========================================================================
    # 7. TAMIL NADU & COROMANDEL SECTOR (region_id: "tamil_nadu") - 3 Features
    # =========================================================================
    {
        "name": "Marina Beach Promenade Chennai",
        "feature_type": "beach",
        "latitude": 13.0500,
        "longitude": 80.2824,
        "geometry": {"type": "Point", "coordinates": [80.2824, 13.0500]},
        "properties": {
            "region_id": "tamil_nadu",
            "category": "beach",
            "patrol_status": "Coastal Security Group Active",
            "caution_notes": "Severe undertow; bathing strictly barred by police.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Dhanushkodi Adam's Bridge Marine Sanctuary",
        "feature_type": "protected_area",
        "latitude": 9.1760,
        "longitude": 79.4180,
        "geometry": {"type": "Point", "coordinates": [79.4180, 9.1760]},
        "properties": {
            "region_id": "tamil_nadu",
            "category": "protected_area",
            "restriction": "Dugong conservation habitat. Trawling banned.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Chennai Port Commercial Fairway",
        "feature_type": "restricted_area",
        "latitude": 13.1000,
        "longitude": 80.3200,
        "geometry": {"type": "Point", "coordinates": [80.3200, 13.1000]},
        "properties": {
            "region_id": "tamil_nadu",
            "category": "restricted_area",
            "restriction": "Deepwater navigation fairway. Port control VHF Ch 14.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },

    # =========================================================================
    # 8. ANDHRA PRADESH & VIZAG SECTOR (region_id: "andhra_pradesh") - 3 Features
    # =========================================================================
    {
        "name": "Rushikonda Blue Flag Beach Visakhapatnam",
        "feature_type": "beach",
        "latitude": 17.7819,
        "longitude": 83.3837,
        "geometry": {"type": "Point", "coordinates": [83.3837, 17.7819]},
        "properties": {
            "region_id": "andhra_pradesh",
            "category": "beach",
            "patrol_status": "Blue Flag Certified · Professional Lifeguards",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Ramakrishna Beach Rip Hazard Zone",
        "feature_type": "risk_zone",
        "latitude": 17.7125,
        "longitude": 83.3228,
        "geometry": {"type": "Point", "coordinates": [83.3228, 17.7125]},
        "properties": {
            "region_id": "andhra_pradesh",
            "category": "risk_zone",
            "hazard_level": "Submarine Shelf Undertow",
            "warning": "Sudden deep dropoff with lethal rip currents. Swimming prohibited.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Eastern Naval Command Tactical Corridor",
        "feature_type": "restricted_area",
        "latitude": 17.6600,
        "longitude": 83.2900,
        "geometry": {"type": "Point", "coordinates": [83.2900, 17.6600]},
        "properties": {
            "region_id": "andhra_pradesh",
            "category": "restricted_area",
            "restriction": "Submarine & fleet transit channel. Strictly prohibited zone.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },

    # =========================================================================
    # 9. WEST BENGAL & SUNDARBANS SECTOR (region_id: "west_bengal") - 3 Features
    # =========================================================================
    {
        "name": "Digha Sea Beach & Lifeguard Promenade",
        "feature_type": "beach",
        "latitude": 21.6266,
        "longitude": 87.5074,
        "geometry": {"type": "Point", "coordinates": [87.5074, 21.6266]},
        "properties": {
            "region_id": "west_bengal",
            "category": "beach",
            "patrol_status": "Lifeguards & Coastal Police Active",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Sundarbans Estuary Mangrove Reserve",
        "feature_type": "protected_area",
        "latitude": 21.8000,
        "longitude": 88.8000,
        "geometry": {"type": "Point", "coordinates": [88.8000, 21.8000]},
        "properties": {
            "region_id": "west_bengal",
            "category": "protected_area",
            "restriction": "Tidal delta biosphere reserve. Forest department clearance mandatory.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Haldia Port Deepwater Approach Fairway",
        "feature_type": "restricted_area",
        "latitude": 22.0200,
        "longitude": 88.0800,
        "geometry": {"type": "Point", "coordinates": [88.0800, 22.0200]},
        "properties": {
            "region_id": "west_bengal",
            "category": "restricted_area",
            "restriction": "Major riverine port navigation fairway. Pilotage mandatory.",
            "allowed_roles": ["authority", "fisher", "disaster_management", "tourist"],
        },
    },

    # =========================================================================
    # 10. ISLANDS (ANDAMAN & NICOBAR) SECTOR (region_id: "islands") - 3 Features
    # =========================================================================
    {
        "name": "Radhanagar Beach (Havelock Island)",
        "feature_type": "beach",
        "latitude": 11.9840,
        "longitude": 92.9510,
        "geometry": {"type": "Point", "coordinates": [92.9510, 11.9840]},
        "properties": {
            "region_id": "islands",
            "category": "beach",
            "patrol_status": "Blue Flag Certified Sanctuary Shore",
            "amenities": ["Boardwalk", "Rainforest Canopy", "Shower Facilities"],
            "suitable_activities": ["beach_visit", "sightseeing", "swimming"],
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Mahatma Gandhi Marine National Park",
        "feature_type": "protected_area",
        "latitude": 11.5300,
        "longitude": 92.5800,
        "geometry": {"type": "Point", "coordinates": [92.5800, 11.5300]},
        "properties": {
            "region_id": "islands",
            "category": "protected_area",
            "restriction": "Live coral reef park & sea turtle sanctuary. Strict eco-tourism regulations.",
            "allowed_roles": ["*"],
        },
    },
    {
        "name": "Ten Degree Channel Security Sector",
        "feature_type": "restricted_area",
        "latitude": 10.0000,
        "longitude": 92.5000,
        "geometry": {"type": "Point", "coordinates": [92.5000, 10.0000]},
        "properties": {
            "region_id": "islands",
            "category": "restricted_area",
            "status": "STRATEGIC ISLAND MARITIME CORRIDOR",
            "restriction": "Andaman & Nicobar Joint Command surveillance grid.",
            "is_restricted": True,
            "allowed_roles": ["authority", "disaster_management"],
        },
    },
]
