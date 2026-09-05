export interface CoastalRegion {
  id: string;
  name: string;
  state: string;
  center: [number, number];
  defaultZoom: number;
  description: string;
  buoyStation: string;
}

export const COASTAL_REGIONS: CoastalRegion[] = [
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
