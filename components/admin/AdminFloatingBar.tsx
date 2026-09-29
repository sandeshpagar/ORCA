"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/contexts/FeatureFlagContext";
import { ROLE_DETAILS } from "@/lib/recommendations";

export default function AdminFloatingBar() {
  const { isAdmin, role, setRoleAsAdmin } = useAuth();
  const { flags } = useFeatureFlags();
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // If not logged in as super admin, render nothing
  if (!isAdmin) return null;

  const sandboxCount = flags.filter((f) => f.status === "SANDBOX_ONLY").length;
  const currentRoleInfo = ROLE_DETAILS[role] || {
    label: role,
    icon: "admin_panel_settings",
    desc: "Active Persona",
  };

  const rolesList: UserRole[] = [
    "fisher",
    "authority",
    "tourist",
    "researcher",
    "disaster_management",
  ];

  if (isMinimized) {
    return (
      <aside aria-label="Admin Control Bar Minimized" className="fixed bottom-3 right-3 z-50 animate-in fade-in zoom-in-90 duration-150">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest border border-amber-500/50 shadow-xl text-amber-900 text-xs font-mono font-bold hover:bg-surface-container transition-all group"
          title="Click to expand ORCA Admin Control Bar"
        >
          <span className="material-symbols-outlined text-[16px] text-amber-600 group-hover:rotate-12 transition-transform">
            admin_panel_settings
          </span>
          <span>ADMIN MODE</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="Admin Control Bar" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-full px-2 animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-surface-container-lowest/95 backdrop-blur-xl border-2 border-amber-500/40 shadow-2xl text-on-surface text-xs font-mono">
        {/* Admin Badge */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-surface-container shrink-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[15px]">shield_person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[10px] uppercase tracking-wider text-amber-800">
              Admin Mode
            </span>
            <span className="text-[9px] text-on-surface-variant font-medium">
              admin@gmail.com
            </span>
          </div>
        </div>

        {/* Perspective Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-primary font-semibold transition-all group"
            title="Switch User Perspective without logging in/out"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">
              {currentRoleInfo.icon}
            </span>
            <span className="text-xs truncate max-w-[120px] sm:max-w-none">
              View as: <strong className="text-secondary uppercase">{currentRoleInfo.label}</strong>
            </span>
            <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-primary transition-colors">
              {isRoleMenuOpen ? "expand_more" : "unfold_more"}
            </span>
          </button>

          {/* Perspective Dropdown Popover */}
          {isRoleMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsRoleMenuOpen(false)}
              />
              <div className="absolute left-0 bottom-full mb-2 w-64 bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-on-surface-variant border-b border-surface-container flex items-center justify-between">
                  <span>Switch Perspective</span>
                  <span className="text-[9px] text-secondary">Instant Preview</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  {rolesList.map((rKey) => {
                    const rDetail = ROLE_DETAILS[rKey];
                    const isSelected = rKey === role;
                    return (
                      <button
                        key={rKey}
                        type="button"
                        onClick={() => {
                          setRoleAsAdmin(rKey);
                          setIsRoleMenuOpen(false);
                        }}
                        className={`flex items-start gap-2 p-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? "bg-secondary-fixed/50 border border-secondary/40 font-bold"
                            : "hover:bg-surface-container border border-transparent"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5 shrink-0">
                          {rDetail.icon}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs text-primary">{rDetail.label}</span>
                          <span className="text-[10px] text-on-surface-variant line-clamp-1">
                            {rDetail.desc}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[15px] text-secondary shrink-0">
                            check
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Links */}
        <Link
          href="/admin"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container text-primary font-semibold transition-all shrink-0"
          title="Open Admin Control Hub & Feature Staging"
        >
          <span className="material-symbols-outlined text-[15px] text-primary">dashboard</span>
          <span className="hidden sm:inline">Admin Hub</span>
        </Link>

        <Link
          href="/admin?tab=staging"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 font-semibold transition-all shrink-0"
          title="Manage Feature Flags & Push to Live"
        >
          <span className="material-symbols-outlined text-[15px] text-amber-700">science</span>
          <span className="hidden md:inline">Staging</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
            {sandboxCount}
          </span>
        </Link>

        {/* Minimize Button */}
        <button
          type="button"
          onClick={() => setIsMinimized(true)}
          className="p-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container transition-colors shrink-0 ml-1"
          title="Minimize admin toolbar"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </aside>
  );
}
