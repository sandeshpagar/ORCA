"use client";

import { useAuth, UserRole } from "@/contexts/AuthContext";

interface RoleCard {
  id: UserRole;
  title: string;
  description: string;
  icon: string;
  badge: string;
}

const roleCards: RoleCard[] = [
  {
    id: "fisherman",
    title: "Fisherman",
    description: "Fishing zone & sail-safety guidance",
    icon: "sailing",
    badge: "Safety & PFZ",
  },
  {
    id: "researcher",
    title: "Researcher",
    description: "Historical data, trends & exports",
    icon: "query_stats",
    badge: "Analytics & NetCDF",
  },
  {
    id: "authority",
    title: "Coastal Authority",
    description: "Real-time alerts & risk dashboards",
    icon: "shield",
    badge: "Emergency Grid",
  },
  {
    id: "tourist",
    title: "Tourist",
    description: "Beach safety & travel advisories in plain language",
    icon: "beach_access",
    badge: "Beach Safety",
  },
  {
    id: "operator",
    title: "Maritime Operator",
    description: "Route safety & port conditions",
    icon: "directions_boat",
    badge: "Commercial Transit",
  },
];

export default function RoleSelectionModal() {
  const { role, setRole, showRoleModal, setShowRoleModal } = useAuth();

  if (!showRoleModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 bg-surface-container-low border-b border-surface-container">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-mono font-semibold">
              ISRO Mission Conditioning
            </span>
          </div>
          <h2 className="font-headline-md text-headline-md text-primary font-bold">
            Select Your Operational Persona
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            ORCA adapts live maps, advisory AI, and sensor feeds to your maritime mission.
          </p>
        </div>

        {/* 5 Selectable Role Cards */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {roleCards.map((item) => {
            const isSelected = role === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setRole(item.id)}
                type="button"
                className={`w-full p-3.5 rounded-xl text-left flex items-start gap-3.5 transition-all border ${
                  isSelected
                    ? "bg-secondary-container/30 border-secondary ring-2 ring-secondary/30 shadow-sm"
                    : "bg-surface-container-low border-surface-container hover:bg-surface-container hover:border-outline-variant/50"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-secondary text-on-secondary shadow-sm"
                      : "bg-primary-container text-on-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-headline-sm text-[16px] text-primary font-bold">
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
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
                <div className="pt-1">
                  <span
                    className={`material-symbols-outlined text-[20px] ${
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
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            You can change roles anytime from the header
          </span>
          <button
            onClick={() => setShowRoleModal(false)}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold hover:bg-primary-container active:scale-95 transition-all shadow-md"
          >
            Confirm & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
