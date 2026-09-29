import { CoastalRegion } from "@/lib/regions";
import { UserRole } from "@/contexts/AuthContext";

export interface RegionLandmarks {
  primaryBeach: string;
  primaryPort: string;
  coastalSpot: string;
  buoyStation: string;
}

export const REGION_LANDMARKS: Record<string, RegionLandmarks> = {
  odisha: {
    primaryBeach: "Puri Golden Beach",
    primaryPort: "Paradip Port",
    coastalSpot: "Gopalpur & Rushikulya Sanctuaries",
    buoyStation: "Buoy BD-12 (Gopalpur Deep)",
  },
  maharashtra: {
    primaryBeach: "Juhu Beach",
    primaryPort: "JNPT / Mumbai Harbor",
    coastalSpot: "Marine Drive & Versova",
    buoyStation: "Buoy AD-06 (Mumbai High)",
  },
  goa: {
    primaryBeach: "Calangute Beach",
    primaryPort: "Mormugao Port Fairway",
    coastalSpot: "Palolem & Grande Island",
    buoyStation: "Buoy AD-07 (Mormugao Outer)",
  },
  gujarat: {
    primaryBeach: "Shivrajpur Blue Flag Beach",
    primaryPort: "Kandla Fairway & Okha",
    coastalSpot: "Dwarka Coastal Shore",
    buoyStation: "Buoy AD-02 (Gulf of Kutch)",
  },
  karnataka: {
    primaryBeach: "Gokarna Om Beach",
    primaryPort: "New Mangalore Port",
    coastalSpot: "Panambur & Malpe Coast",
    buoyStation: "Buoy AD-09 (Karwar Outer)",
  },
  kerala: {
    primaryBeach: "Kovalam Lighthouse Beach",
    primaryPort: "Cochin Deepwater Fairway",
    coastalSpot: "Varkala Cliff Beach",
    buoyStation: "Buoy CB-02 (Cochin Deep)",
  },
  tamil_nadu: {
    primaryBeach: "Marina Beach Promenade",
    primaryPort: "Chennai Port Fairway",
    coastalSpot: "Mahabalipuram Shore",
    buoyStation: "Buoy BD-08 (Chennai Basin)",
  },
  andhra_pradesh: {
    primaryBeach: "Rushikonda Beach",
    primaryPort: "Visakhapatnam Fairway",
    coastalSpot: "Ramakrishna Beach Promenade",
    buoyStation: "Buoy BD-10 (Vizag Shelf)",
  },
  west_bengal: {
    primaryBeach: "Digha Sea Beach",
    primaryPort: "Haldia Port Channel",
    coastalSpot: "Sundarbans Mangrove Reserve",
    buoyStation: "Buoy BD-14 (Sandheads Deep)",
  },
  islands: {
    primaryBeach: "Radhanagar Beach (Havelock)",
    primaryPort: "Port Blair Harbor",
    coastalSpot: "Ten Degree Channel Grid",
    buoyStation: "Buoy CB-05 (Andaman Sea)",
  },
};

export const ROLE_DETAILS: Record<
  UserRole,
  { label: string; icon: string; badge: string; desc: string }
> = {
  fisher: {
    label: "Fisher",
    icon: "sailing",
    badge: "Safety & PFZ",
    desc: "PFZ boundaries, wave alerts & sea-state sail directives",
  },
  researcher: {
    label: "Researcher",
    icon: "query_stats",
    badge: "Oceanography",
    desc: "SST anomalies, chlorophyll-a trends, salinity & wave spectra",
  },
  tourist: {
    label: "Tourist",
    icon: "beach_access",
    badge: "Beach Safety",
    desc: "Swimming safety, sightseeing windows & coastal conditions",
  },
  authority: {
    label: "Authority",
    icon: "shield",
    badge: "Port & Maritime",
    desc: "Port signal flags, vessel separation & maritime coordination",
  },
  disaster_management: {
    label: "Disaster Mgmt",
    icon: "emergency",
    badge: "Emergency Ops",
    desc: "Cyclone surge models, extreme gusts & coastal preparedness",
  },
  general: {
    label: "General Public",
    icon: "public",
    badge: "Public Info",
    desc: "General coastal weather awareness & daily sea status",
  },
};

/**
 * Returns authentic, domain-specific recommendation query chips dynamically
 * parameterized by the active user role, coastal region, and interface language.
 */
export function getDynamicRecommendations(
  role: UserRole = "general",
  region: CoastalRegion,
  langCode: string = "en"
): string[] {
  const lm = REGION_LANDMARKS[region.id] || {
    primaryBeach: region.name,
    primaryPort: `${region.name} Fairway`,
    coastalSpot: region.description.split(",")[0] || region.name,
    buoyStation: region.buoyStation,
  };

  const regName = region.name;
  const beach = lm.primaryBeach;
  const port = lm.primaryPort;
  const spot = lm.coastalSpot;
  const buoy = lm.buoyStation;

  // 1. Hindi recommendations
  if (langCode === "hi") {
    switch (role) {
      case "fisher":
        return [
          `क्या आज रात ${beach} से 15 नॉटिकल मील दूर यंत्रीकृत नौकाएं जा सकती हैं?`,
          `क्या ${regName} के पास सक्रिय संभावित मत्स्य पालन क्षेत्र (PFZ) उपलब्ध हैं?`,
          `${port} के पास वर्तमान में लहरों की ऊंचाई और हवा की गति क्या है?`,
          `क्या ${regName} में छोटी नौकाओं के लिए कोई तेज हवा या तूफान की चेतावनी है?`,
          `क्या कल सुबह गैर-यंत्रीकृत नौकाओं का ${port} से समुद्र में जाना सुरक्षित है?`,
        ];
      case "researcher":
        return [
          `${beach} के पास वर्तमान समुद्री सतह तापमान (SST) और थर्मल ग्रेडिएंट क्या है?`,
          `${buoy} पर महत्वपूर्ण लहर ऊंचाई (Hs) और तरंग स्पेक्ट्रा दिखाएं।`,
          `${regName} के पास नवीनतम उपग्रह क्लोरोफिल-ए और टर्बिडिटी स्तर क्या हैं?`,
          `${spot} के आसपास समुद्र विज्ञान पर्यावरण टेलीमेट्री और लवणता प्रोफ़ाइल प्रदान करें।`,
          `${buoy} पर वायुमंडलीय पवन तनाव और सीमा परत टेलीमेट्री का विश्लेषण करें।`,
        ];
      case "tourist":
        return [
          `क्या आज ${beach} पर तैरना और समुद्र तट पर जाना सुरक्षित है?`,
          `${spot} के आसपास दर्शनीय स्थलों और सुरक्षित टहलने के समय की सिफारिश करें।`,
          `क्या ${port} के पास नौका विहार और वाटर स्पोर्ट्स के लिए स्थितियां अनुकूल हैं?`,
          `शांत समुद्र की स्थिति में ${beach} घूमने का सबसे अच्छा समय कौन सा है?`,
          `क्या आज ${beach} पर हाई टाइड या रिप करंट का कोई अलर्ट है?`,
        ];
      case "authority":
        return [
          `${port} के लिए नौवहन निकासी और समुद्री स्थिति क्या है?`,
          `${regName} के लिए पत्तन सिग्नल ध्वज और चेतावनी स्थिति क्या है?`,
          `${port} के पास पोत यातायात गलियारों (TSS) और सुरक्षा परामर्श की जांच करें।`,
          `${beach} से खोज एवं बचाव (SAR) अभियानों के लिए सतही धाराएं क्या हैं?`,
          `क्या ${regName} में कोई सक्रिय तटीय सुरक्षा सूचना है?`,
        ];
      case "disaster_management":
        return [
          `क्या ${regName} के लिए कोई चक्रवात तूफान या तटीय जलभराव की चेतावनी है?`,
          `${beach} तट के लिए चरम हवा के झोंके और अलर्ट स्तर की जांच करें।`,
          `${port} पर ज्वारीय वृद्धि जोखिम और समुद्री दीवार पर लहरों के प्रभाव का आकलन करें।`,
          `${regName} के लिए आपातकालीन घटना कमान तैयारी स्तर क्या है?`,
          `आगामी उच्च ज्वार के दौरान ${beach} पर अनुमानित लहर ऊंचाई क्या होगी?`,
        ];
      default:
        return [
          `वर्तमान में ${beach} पर मौसम और समुद्र की स्थिति क्या है?`,
          `क्या आज ${beach} पर समुद्र तट पर जाना सुरक्षित है?`,
          `अगले 24 घंटों में ${regName} के लिए समुद्र और हवा का पूर्वानुमान क्या है?`,
          `क्या ${regName} के लिए कोई सक्रिय तटीय चेतावनी है?`,
          `${beach} के आसपास पानी का तापमान और स्थितियां कैसी हैं?`,
        ];
    }
  }

  // 2. Marathi recommendations
  if (langCode === "mr") {
    switch (role) {
      case "fisher":
        return [
          `आज रात्री ${beach} पासून 15 नॉटिकल मैल अंतरावर यांत्रिकी नौका जाणे सुरक्षित आहे का?`,
          `${regName} नजीक सक्रिय संभाव्य मासेमारी क्षेत्र (PFZ) कुठे आहेत?`,
          `${port} जवळ सध्या लाटांची उंची आणि वाऱ्याचा वेग काय आहे?`,
          `${regName} किनारपट्टीवर लहान बोटींसाठी वादळी वाऱ्याचा इशारा आहे का?`,
          `उद्या सकाळी ${port} जवळून अयांत्रिकी बोटी समुद्रात नेणे सुरक्षित आहे का?`,
        ];
      case "researcher":
        return [
          `${beach} जवळील समुद्र पृष्ठभाग तापमान (SST) आणि थर्मल ग्रेडियंट काय आहे?`,
          `${buoy} वरील लाटांची उंची (Hs) आणि तरंग स्पेक्ट्रा दाखवा.`,
          `${regName} मधील क्लोरोफिल-ए आणि टर्बिडिटी एकाग्रता पातळी तपासा.`,
          `${spot} परिसरातील महासागर पर्यावरण टेलिमेट्री व क्षारता प्रोफाइल द्या.`,
          `${buoy} वरील वाऱ्याचा ताण व सीमास्तर टेलिमेट्रीचे विश्लेषण करा.`,
        ];
      case "tourist":
        return [
          `आज ${beach} वर पोहणे आणि समुद्रकिनाऱ्यावर फिरणे सुरक्षित आहे का?`,
          `${spot} परिसरातील पर्यटन स्थळांची व सुरक्षित वेळेची शिफारस करा.`,
          `${port} जवळ बोटिंग आणि वॉटर स्पोर्ट्ससाठी परिस्थिती योग्य आहे का?`,
          `शांत समुद्राच्या वेळी ${beach} ला भेट देण्यासाठी कोणती वेळ उत्तम आहे?`,
          `आज ${beach} वर भरती किंवा रिप करंटचा कोणताही इशारा आहे का?`,
        ];
      case "authority":
        return [
          `${port} साठी जलवाहतूक क्लिअरन्स आणि सागरी परिस्थिती काय आहे?`,
          `${regName} साठी बंदर सिग्नल ध्वज आणि सतर्कता स्थिती काय आहे?`,
          `${port} नजीक जहाज वाहतूक विभक्तता (TSS) मार्ग तपासा.`,
          `${beach} जवळ शोध व बचाव (SAR) मोहिमेसाठी पृष्ठभाग प्रवाह निर्देशक द्या.`,
          `${regName} भागात काही सक्रिय सागरी सुरक्षा सूचना आहेत का?`,
        ];
      case "disaster_management":
        return [
          `${regName} किनारपट्टीसाठी चक्रीवादळ किंवा पूर धोका इशारा आहे का?`,
          `${beach} किनाऱ्यासाठी वादळी वाऱ्याचे प्रमाण आणि सतर्कता पातळी तपासा.`,
          `${port} जवळ भरतीची लाट आणि पाणी शिरण्याचा धोका किती आहे?`,
          `${regName} साठी आपत्कालीन प्रतिसाद तयारी पातळी काय आहे?`,
          `पुढील भरतीदरम्यान ${beach} वर लाटांची संभाव्य उंची किती असेल?`,
        ];
      default:
        return [
          `सध्या ${beach} वरील हवामान आणि समुद्राची स्थिती कशी आहे?`,
          `आज ${beach} वर फिरायला जाणे सुरक्षित आहे का?`,
          `पुढील 24 तासांत ${regName} साठी समुद्राचा आणि वाऱ्याचा अंदाज काय आहे?`,
          `${regName} साठी कोणतीही सक्रिय सागरी चेतावणी आहे का?`,
          `${beach} परिसरातील पाण्याचे तापमान आणि लाटांची स्थिती काय आहे?`,
        ];
    }
  }

  // 3. English recommendations (Default)
  switch (role) {
    case "fisher":
      return [
        `Can mechanised trawlers venture 15 nautical miles off ${beach} tonight?`,
        `Where are active Potential Fishing Zones (PFZ) and chlorophyll fronts near ${regName}?`,
        `What is the current wave height and surface wind speed off ${port}?`,
        `Are there any squall surge or rough sea warnings for small craft in ${regName}?`,
        `Is it safe for non-mechanised boats to cross the bar at ${port} tomorrow morning?`,
      ];
    case "researcher":
      return [
        `What is the Sea Surface Temperature (SST) and thermal gradient near ${beach}?`,
        `Show significant wave height (Hs), swell period, and spectra at ${buoy}.`,
        `What are the latest satellite chlorophyll-a and turbidity concentration levels off ${regName}?`,
        `Provide oceanographic environmental telemetry and salinity profile around ${spot}.`,
        `Analyze wind stress vectors and boundary layer telemetry at ${buoy}.`,
      ];
    case "tourist":
      return [
        `Is it safe to swim and bathe at ${beach} today?`,
        `Recommend coastal sightseeing spots and safe beach walk times around ${spot}.`,
        `Are conditions suitable for recreational boat rides and water sports near ${port}?`,
        `What is the best time window to visit ${beach} with calm sea conditions?`,
        `Are there any high tide or rip current alerts at ${beach} today?`,
      ];
    case "authority":
      return [
        `What is the fairway sea-state and navigational clearance for ${port}?`,
        `What is the operational port signal flag and maritime alert status for ${regName}?`,
        `Check vessel traffic fairways and marine traffic advisories near ${port}.`,
        `Provide wind drift and surface current vectors for SAR operations off ${beach}.`,
        `Are there any coastal defense or navigational fairway warnings in ${regName}?`,
      ];
    case "disaster_management":
      return [
        `Is there any cyclone surge or coastal inundation warning for ${regName}?`,
        `Check extreme gust indices and storm alert level for ${beach} coast.`,
        `Assess tidal surge risk and sea wall overtopping probability at ${port}.`,
        `What is the emergency incident command readiness level for ${regName}?`,
        `What are the projected wave heights during the upcoming high tide at ${beach}?`,
      ];
    default:
      return [
        `What are the current weather and ocean conditions at ${beach}?`,
        `Is it safe to visit the beach or go for a coastal walk at ${beach} today?`,
        `What is the sea-state and wind forecast for ${regName} over the next 24 hours?`,
        `Are there any active coastal hazard alerts or advisories for ${regName}?`,
        `What is the water temperature and UV index around ${beach}?`,
      ];
  }
}
