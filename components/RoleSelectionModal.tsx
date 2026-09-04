"use client";

import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";

interface RoleCard {
  id: UserRole;
  title: string;
  description: string;
  icon: string;
  badge: string;
}

// 6 Constrained Roles per docs/04_Design_Document.md §4:
// tourist, fisher, authority, researcher, disaster_management, general
const roleCards: RoleCard[] = [
  {
    id: "tourist",
    title: "Tourist",
    description: "Beach safety, swimming windows & travel advisories in plain language",
    icon: "beach_access",
    badge: "Beach Safety",
  },
  {
    id: "fisher",
    title: "Fisher",
    description: "Potential Fishing Zone (PFZ) boundaries & sea-state sail-safety directives",
    icon: "sailing",
    badge: "Safety & PFZ",
  },
  {
    id: "authority",
    title: "Coastal Authority",
    description: "Maritime security, port signal monitoring & coastal patrol coordination",
    icon: "shield",
    badge: "Institutional Grid",
  },
  {
    id: "researcher",
    title: "Researcher",
    description: "Historical oceanographic datasets, SST/Chlorophyll trends & data exports",
    icon: "query_stats",
    badge: "Analytics & NetCDF",
  },
  {
    id: "disaster_management",
    title: "Disaster Management",
    description: "Real-time cyclone alerts, risk heatmaps, surge models & shelter readiness",
    icon: "emergency",
    badge: "Emergency Ops",
  },
  {
    id: "general",
    title: "General Public",
    description: "Public coastal weather awareness, tides & educational ocean intelligence",
    icon: "public",
    badge: "Public Info",
  },
];

const touristActivitiesList = [
  {
    id: "beach_visit",
    label: "Beach Visit",
    icon: "beach_access",
    desc: "Promenade walks, swimming, and sunbathing",
  },
  {
    id: "boating",
    label: "Boating",
    icon: "directions_boat",
    desc: "Boat cruises, sea ferries, and coastal tours",
  },
  {
    id: "sightseeing",
    label: "Sightseeing",
    icon: "photo_camera",
    desc: "Lighthouses, coastal heritage, and viewpoints",
  },
  {
    id: "water_recreation",
    label: "Water Recreation",
    icon: "surfing",
    desc: "Surfing, kayaking, jet-skiing, and diving",
  },
];

const languagesList = [
  "English",
  "Hindi (हिंदी)",
  "Marathi (मराठी)",
  "Gujarati (ગુજરાતી)",
  "Odia (ଓଡ଼ିଆ)",
  "Tamil (தமிழ்)",
];

export default function RoleSelectionModal() {
  const {
    role,
    selectInitialRole,
    saveTouristPreferences,
    homeRegion,
    setHomeRegion,
    language,
    setLanguage,
    showRoleModal,
    hasSelectedRole,
  } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>(role || "tourist");
  const [step, setStep] = useState<"role" | "tourist_onboarding">("role");
  const [selectedActivities, setSelectedActivities] = useState<string[]>([
    "beach_visit",
    "sightseeing",
  ]);
  const [selectedLang, setSelectedLang] = useState<string>(language || "English");
  const [regionName, setRegionName] = useState<string>(homeRegion.name);
  const [lat, setLat] = useState<number>(homeRegion.lat);
  const [lon, setLon] = useState<number>(homeRegion.lon);
  const [geoLocating, setGeoLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // CODE CONFIRMATION: RoleSelectionModal must NEVER reappear for a user who already has a role set.
  // Once hasSelectedRole is true, this modal unconditionally renders null and cannot be opened again.
  if (!showRoleModal || hasSelectedRole) {
    return null;
  }

  const toggleActivity = (actId: string) => {
    setSelectedActivities((prev) =>
      prev.includes(actId)
        ? prev.filter((a) => a !== actId)
        : [...prev, actId]
    );
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(4));
        const newLon = parseFloat(pos.coords.longitude.toFixed(4));
        setLat(newLat);
        setLon(newLon);
        setRegionName("Current Geo Location");
        setGeoLocating(false);
      },
      () => {
        setGeoLocating(false);
        setLat(19.31);
        setLon(84.91);
        setRegionName("Gopalpur Sector (GPS Fallback)");
      },
      { timeout: 6000 }
    );
  };

  const handleProceedFromRole = async () => {
    if (selectedRole === "tourist") {
      setStep("tourist_onboarding");
    } else {
      setIsSubmitting(true);
      await selectInitialRole(selectedRole);
      setIsSubmitting(false);
    }
  };

  const handleFinishTouristOnboarding = async () => {
    setIsSubmitting(true);
    setLanguage(selectedLang);
    setHomeRegion({ name: regionName, lat, lon });
    await selectInitialRole("tourist");
    await saveTouristPreferences(selectedActivities, "leisure", selectedLang);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container overflow-hidden flex flex-col max-h-[90vh]">
        {/* STEP 1: ROLE SELECTION */}
        {step === "role" && (
          <>
            {/* Header */}
            <div className="p-6 pb-4 bg-surface-container-low border-b border-surface-container">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-mono font-semibold">
                  ISRO Mission Conditioning · Step 1 of {selectedRole === "tourist" ? "2" : "1"}
                </span>
              </div>
              <h2 className="font-headline-md text-headline-md text-primary font-bold">
                Select Your Operational Persona
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                ORCA adapts live maps, advisory AI, and sensor feeds to your maritime mission.
              </p>
            </div>

            {/* 6 Selectable Role Cards */}
            <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
              {roleCards.map((item) => {
                const isSelected = selectedRole === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedRole(item.id)}
                    type="button"
                    className={`w-full p-3 rounded-xl text-left flex items-start gap-3 transition-all border ${
                      isSelected
                        ? "bg-secondary-container/30 border-secondary ring-2 ring-secondary/30 shadow-sm"
                        : "bg-surface-container-low border-surface-container hover:bg-surface-container"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "bg-secondary text-on-secondary shadow-sm"
                          : "bg-primary-container text-on-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-headline-sm text-[15px] text-primary font-bold">
                          {item.title}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                            isSelected
                              ? "bg-secondary text-on-secondary"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="font-body-sm text-[12px] text-on-surface-variant mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                    <div className="pt-1">
                      <span
                        className={`material-symbols-outlined text-[18px] ${
                          isSelected ? "text-secondary" : "text-outline-variant"
                        }`}
                      >
                        {isSelected ? "radio_button_checked" : "radio_button_unchecked"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Role is permanently locked once confirmed
              </span>
              <button
                onClick={handleProceedFromRole}
                disabled={isSubmitting}
                type="button"
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold hover:bg-primary-container active:scale-95 transition-all shadow-md flex items-center gap-1.5"
              >
                {selectedRole === "tourist" ? (
                  <>
                    <span>Next: Tourist Onboarding</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </>
                ) : (
                  <span>Confirm &amp; Proceed</span>
                )}
              </button>
            </div>
          </>
        )}

        {/* STEP 2: TOURIST ONBOARDING (ACTIVITIES + LANGUAGE + LOCATION) */}
        {step === "tourist_onboarding" && (
          <>
            <div className="p-6 pb-4 bg-surface-container-low border-b border-surface-container">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-mono font-semibold">
                  Tourist Onboarding · Step 2 of 2
                </span>
                <button
                  onClick={() => setStep("role")}
                  type="button"
                  className="text-[12px] text-on-surface-variant hover:text-primary flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Back</span>
                </button>
              </div>
              <h2 className="font-headline-md text-headline-md text-primary font-bold">
                Personalize Your Beach &amp; Travel Experience
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Select your planned coastal activities and confirm your preferred language and location.
              </p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Activity Picker (Multi-select) */}
              <div>
                <label className="block font-label-sm text-label-sm font-semibold text-primary mb-1.5">
                  1. Preferred Coastal Activities (Select all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {touristActivitiesList.map((act) => {
                    const isChecked = selectedActivities.includes(act.id);
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => toggleActivity(act.id)}
                        className={`p-3 rounded-xl text-left border flex flex-col justify-between transition-all ${
                          isChecked
                            ? "bg-secondary-container/30 border-secondary ring-2 ring-secondary/30"
                            : "bg-surface-container-low border-surface-container hover:bg-surface-container"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="material-symbols-outlined text-[20px] text-secondary">
                            {act.icon}
                          </span>
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              isChecked ? "text-secondary" : "text-outline-variant"
                            }`}
                          >
                            {isChecked ? "check_box" : "check_box_outline_blank"}
                          </span>
                        </div>
                        <span className="font-semibold text-primary text-[13px] block">
                          {act.label}
                        </span>
                        <span className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                          {act.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Selector */}
              <div>
                <label className="block font-label-sm text-label-sm font-semibold text-primary mb-1.5">
                  2. Advisory Language Preference
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {languagesList.map((lang) => {
                    const isSel = selectedLang === lang;
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLang(lang)}
                        className={`py-2 px-2 text-center rounded-lg text-[12px] border transition-all ${
                          isSel
                            ? "bg-secondary text-on-secondary font-bold border-secondary shadow-sm"
                            : "bg-surface-container-low border-surface-container hover:bg-surface-container text-primary"
                        }`}
                      >
                        {lang.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-label-sm text-label-sm font-semibold text-primary">
                    3. Home Coastal Region / Destination
                  </label>
                  <button
                    onClick={handleUseMyLocation}
                    disabled={geoLocating}
                    type="button"
                    className="text-[11px] text-secondary font-semibold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">my_location</span>
                    <span>{geoLocating ? "Acquiring..." : "Use My Location"}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={regionName}
                  onChange={(e) => setRegionName(e.target.value)}
                  placeholder="e.g. Puri Golden Beach, Gopalpur"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2 mt-1.5 font-mono text-[11px] text-on-surface-variant">
                  <span>Lat: {lat.toFixed(4)}° N</span>
                  <span>Lon: {lon.toFixed(4)}° E</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-container-low border-t border-surface-container flex items-center justify-between">
              <button
                onClick={() => setStep("role")}
                type="button"
                className="text-body-sm text-on-surface-variant hover:text-primary font-semibold"
              >
                Change Role
              </button>
              <button
                onClick={handleFinishTouristOnboarding}
                disabled={isSubmitting}
                type="button"
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold hover:bg-primary-container active:scale-95 transition-all shadow-md flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Launch ORCA Tourist Grid</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
