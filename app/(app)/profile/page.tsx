"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/contexts/AuthContext";

const rolesList: { id: UserRole; title: string; desc: string; icon: string }[] = [
  {
    id: "tourist",
    title: "Tourist",
    desc: "Beach safety, swimming windows & travel advisories in plain language",
    icon: "beach_access",
  },
  {
    id: "fisher",
    title: "Fisher",
    desc: "Potential Fishing Zone (PFZ) boundaries & sail-safety guidance",
    icon: "sailing",
  },
  {
    id: "authority",
    title: "Coastal Authority",
    desc: "Maritime security, port monitoring & coastal surveillance",
    icon: "shield",
  },
  {
    id: "researcher",
    title: "Researcher",
    desc: "Historical data, ocean trends & analytical exports",
    icon: "query_stats",
  },
  {
    id: "disaster_management",
    title: "Disaster Management",
    desc: "Real-time alerts, crisis command & risk dashboards",
    icon: "emergency",
  },
  {
    id: "general",
    title: "General Public",
    desc: "Public marine weather awareness & educational intelligence",
    icon: "public",
  },
];

const touristActivitiesList = [
  { id: "beach_visit", label: "Beach Visit", icon: "beach_access" },
  { id: "boating", label: "Boating", icon: "directions_boat" },
  { id: "sightseeing", label: "Sightseeing", icon: "photo_camera" },
  { id: "water_recreation", label: "Water Recreation", icon: "surfing" },
];

const languagesList = [
  "English",
  "Hindi (हिंदी)",
  "Marathi (मराठी)",
  "Gujarati (ગુજરાતી)",
  "Odia (ଓଡ଼ିଆ)",
  "Tamil (தமிழ்)",
];

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    role,
    homeRegion,
    setHomeRegion,
    language,
    setLanguage,
    touristActivities,
    saveTouristPreferences,
    logout,
  } = useAuth();

  const [regionInput, setRegionInput] = useState(homeRegion.name);
  const [latInput, setLatInput] = useState(homeRegion.lat.toString());
  const [lonInput, setLonInput] = useState(homeRegion.lon.toString());
  const [geoLocating, setGeoLocating] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    touristActivities.length > 0 ? touristActivities : ["beach_visit", "sightseeing"]
  );

  const currentRoleDetails =
    rolesList.find((r) => r.id === role) || rolesList[0];

  const handleSaveRegion = () => {
    const lat = parseFloat(latInput) || 19.31;
    const lon = parseFloat(lonInput) || 84.91;
    setHomeRegion({
      name: regionInput || "Custom Coastal Sector",
      lat,
      lon,
    });
    setSaveFeedback("Home region updated successfully!");
    setTimeout(() => setSaveFeedback(null), 2500);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(4));
        const lon = parseFloat(pos.coords.longitude.toFixed(4));
        setLatInput(lat.toString());
        setLonInput(lon.toString());
        setRegionInput("Current Geo Location");
        setHomeRegion({
          name: "Current Geo Location",
          lat,
          lon,
        });
        setGeoLocating(false);
        setSaveFeedback("Location updated from GPS!");
        setTimeout(() => setSaveFeedback(null), 2500);
      },
      () => {
        setGeoLocating(false);
        setLatInput("19.3100");
        setLonInput("84.9100");
        setRegionInput("Gopalpur Sector (GPS Fallback)");
        setHomeRegion({
          name: "Gopalpur Sector (GPS Fallback)",
          lat: 19.31,
          lon: 84.91,
        });
        setSaveFeedback("Location set to coastal sector.");
        setTimeout(() => setSaveFeedback(null), 2500);
      },
      { timeout: 6000 }
    );
  };

  const toggleActivity = async (actId: string) => {
    const next = selectedActivities.includes(actId)
      ? selectedActivities.filter((a) => a !== actId)
      : [...selectedActivities, actId];
    setSelectedActivities(next);
    await saveTouristPreferences(next, "leisure", language);
    setSaveFeedback("Tourist activities updated!");
    setTimeout(() => setSaveFeedback(null), 2000);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex-1 flex flex-col relative w-full bg-surface min-h-[calc(100dvh-4rem)]">
      <div className="max-w-3xl mx-auto w-full px-margin-mobile md:px-margin-desktop py-space-md flex flex-col gap-space-lg pb-24">
        {/* User Identity Header */}
        <div className="bg-surface-container-low rounded-2xl p-space-md shadow-sm border border-surface-container flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-[32px]">person</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-headline-md text-headline-md text-primary font-bold">
                  {user?.name || "Officer"}
                </h1>
                <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-mono uppercase font-bold">
                  ACTIVE
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant font-mono mt-0.5">
                {user?.email || "officer@isro.gov.in"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error-container text-on-error-container hover:bg-error hover:text-on-error text-label-sm font-semibold transition-all border border-error/20"
            title="Sign out of current session"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {saveFeedback && (
          <div className="p-3 rounded-xl bg-secondary-container/40 text-on-secondary-container text-body-sm flex items-center gap-2 border border-secondary/30">
            <span className="material-symbols-outlined text-[18px] text-secondary">
              check_circle
            </span>
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Section 1: Assigned Operational Role (Read-Only) */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                badge
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Assigned Operational Role
              </h2>
            </div>
            <span className="font-label-sm text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-mono uppercase font-semibold">
              Permanent
            </span>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[26px]">
                {currentRoleDetails.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-[16px] text-primary font-bold capitalize">
                  {currentRoleDetails.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-secondary text-on-secondary uppercase">
                  {role}
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                {currentRoleDetails.desc}
              </p>
              <div className="mt-2.5 pt-2 border-t border-surface-container flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[15px] text-secondary">
                  lock
                </span>
                <span>
                  Your role determines what data and features are available to you. Operational roles are permanently locked to preserve data governance.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1b: Tourist Personalization (Rendered when role is tourist) */}
        {role === "tourist" && (
          <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  surfing
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                  Tourist Activity Preferences
                </h2>
              </div>
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Stored in tourist_preferences
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Tailors safety score badges on beach recreation cards.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {touristActivitiesList.map((act) => {
                const isSelected = selectedActivities.includes(act.id);
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => toggleActivity(act.id)}
                    className={`p-3 rounded-xl text-center border flex flex-col items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-secondary-container/30 border-secondary ring-2 ring-secondary/30"
                        : "bg-surface-container-low border-surface-container hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px] text-secondary">
                      {act.icon}
                    </span>
                    <span className="text-[12px] font-semibold text-primary">
                      {act.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-secondary text-on-secondary"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}
                    >
                      {isSelected ? "Active" : "Off"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Home Region & Geographic Coordinates */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">
                pin_drop
              </span>
              <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                Home Coastal Region
              </h2>
            </div>
            <button
              onClick={handleUseMyLocation}
              disabled={geoLocating}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary text-label-sm font-semibold transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                {geoLocating ? "autorenew" : "my_location"}
              </span>
              <span>{geoLocating ? "Acquiring GPS..." : "Use My Location"}</span>
            </button>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Default focus area for swell telemetry, cyclone warnings, and port alerts.
          </p>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block font-label-sm text-label-sm font-semibold text-primary mb-1">
                Sector / Harbor Name
              </label>
              <input
                type="text"
                value={regionInput}
                onChange={(e) => setRegionInput(e.target.value)}
                placeholder="e.g. Gopalpur Shoals (Sector 4)"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono">
              <div>
                <label className="block font-label-sm text-label-sm font-semibold text-primary mb-1 font-sans">
                  Latitude (° N)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latInput}
                  onChange={(e) => setLatInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm font-semibold text-primary mb-1 font-sans">
                  Longitude (° E)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lonInput}
                  onChange={(e) => setLonInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              onClick={handleSaveRegion}
              type="button"
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold hover:bg-primary-container active:scale-95 transition-all shadow-md mt-1"
            >
              Update Coordinates
            </button>
          </div>
        </div>

        {/* Section 3: Language Preference */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              translate
            </span>
            <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
              Language Preference
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Primary language for voice synthesizer alerts and chat responses.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {languagesList.map((lang) => {
              const isSelected =
                language === lang || language.startsWith(lang.split(" ")[0]);
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  type="button"
                  className={`p-3 rounded-xl text-left flex items-center justify-between transition-all border ${
                    isSelected
                      ? "bg-secondary-container/30 border-secondary ring-2 ring-secondary/30 font-semibold"
                      : "bg-surface-container-low border-surface-container hover:bg-surface-container"
                  }`}
                >
                  <span className="text-body-sm text-primary">{lang}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-secondary text-[18px]">
                      check
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: System Provenance & Session Status */}
        <div className="p-space-md rounded-2xl bg-surface-container-low border border-surface-container flex flex-col items-center text-center gap-1.5 font-mono text-[12px] text-on-surface-variant">
          <span className="font-bold text-primary">
            ORCA Mission Grid v2.4.0 · Supabase Auth &amp; FastAPI Connected
          </span>
          <span>Phase 1 Architecture Active</span>
        </div>
      </div>
    </div>
  );
}
