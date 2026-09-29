"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useFeatureFlags, FeatureFlag, FeatureStatus } from "@/contexts/FeatureFlagContext";
import { ROLE_DETAILS } from "@/lib/recommendations";

export default function AdminPage() {
  const router = useRouter();
  const { role, setRoleAsAdmin } = useAuth();
  const {
    flags,
    setFeatureStatus,
    registerNewFeature,
    deleteFeature,
    resetFlagsToDefault,
  } = useFeatureFlags();

  const [activeTab, setActiveTab] = useState<"staging" | "perspectives" | "telemetry">("staging");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Add Feature Form State
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<"AI_MODELS" | "MAP_TELEMETRY" | "ALERTS_SAFETY" | "UX_TOOLS">("UX_TOOLS");
  const [addError, setAddError] = useState<string | null>(null);

  // Statistics
  const totalFlags = flags.length;
  const liveCount = flags.filter((f) => f.status === "PROMOTED_TO_LIVE").length;
  const sandboxCount = flags.filter((f) => f.status === "SANDBOX_ONLY").length;
  const disabledCount = flags.filter((f) => f.status === "DISABLED").length;

  const filteredFlags = flags.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "ALL" || f.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateFeature = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newKey.trim() || !newName.trim()) {
      setAddError("Key and Name are required.");
      return;
    }

    const success = registerNewFeature({
      key: newKey,
      name: newName,
      description: newDesc,
      category: newCategory,
      status: "SANDBOX_ONLY",
    });

    if (success) {
      setNewKey("");
      setNewName("");
      setNewDesc("");
      setIsAddModalOpen(false);
    } else {
      setAddError("A feature with this key already exists or key is invalid.");
    }
  };

  const handleLaunchPerspective = (targetRole: UserRole, targetRoute: "/monitor" | "/chat" = "/monitor") => {
    setRoleAsAdmin(targetRole);
    router.push(targetRoute);
  };

  const rolesList: UserRole[] = [
    "fisher",
    "authority",
    "tourist",
    "researcher",
    "disaster_management",
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Welcome Card with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-mono text-on-surface-variant uppercase font-bold">
            Total Feature Modules
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-primary">{totalFlags}</span>
            <span className="text-xs text-secondary font-mono">Configured</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-mono text-emerald-800 uppercase font-bold">
            Live on Website
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-emerald-800">{liveCount}</span>
            <span className="text-xs text-emerald-700 font-mono">Public Users</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-amber-500/30 shadow-xs flex flex-col gap-1 bg-amber-500/5">
          <span className="text-[11px] font-mono text-amber-900 uppercase font-bold">
            Sandbox Only (Admin Preview)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-amber-900">{sandboxCount}</span>
            <span className="text-xs text-amber-800 font-mono">Staging Lab</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-mono text-on-surface-variant uppercase font-bold">
            Disabled Modules
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-outline">{disabledCount}</span>
            <span className="text-xs text-outline font-mono">Inactive</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-surface-container pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("staging")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "staging"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">science</span>
          <span>Feature Staging &amp; Sandbox</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-[10px]">
            {flags.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("perspectives")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "perspectives"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">group</span>
          <span>Role Perspective Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
            activeTab === "telemetry"
              ? "bg-primary text-on-primary shadow-xs"
              : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">monitoring</span>
          <span>System Telemetry &amp; AI Status</span>
        </button>
      </div>

      {/* TAB 1: FEATURE STAGING & SANDBOX */}
      {activeTab === "staging" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-lowest p-4 rounded-2xl border border-surface-container">
            <div className="flex flex-1 items-center gap-2 max-w-md">
              <div className="relative w-full">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter feature by name, key, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Categories</option>
                <option value="UX_TOOLS">UX &amp; Tools</option>
                <option value="AI_MODELS">AI Models</option>
                <option value="MAP_TELEMETRY">Map Telemetry</option>
                <option value="ALERTS_SAFETY">Alerts &amp; Safety</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-mono font-semibold transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Add Staging Feature</span>
              </button>
              <button
                type="button"
                onClick={resetFlagsToDefault}
                className="px-3 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container text-xs font-mono transition-colors"
                title="Reset all feature flags to system default"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 gap-3">
            {filteredFlags.map((flag) => {
              const isLive = flag.status === "PROMOTED_TO_LIVE";
              const isSandbox = flag.status === "SANDBOX_ONLY";
              return (
                <div
                  key={flag.key}
                  className={`bg-surface-container-lowest p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isLive
                      ? "border-surface-container hover:border-emerald-300"
                      : isSandbox
                      ? "border-amber-400/40 bg-amber-500/5 hover:border-amber-400"
                      : "border-surface-container opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        flag.category === "AI_MODELS"
                          ? "bg-purple-100 text-purple-700"
                          : flag.category === "MAP_TELEMETRY"
                          ? "bg-blue-100 text-blue-700"
                          : flag.category === "ALERTS_SAFETY"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {flag.category === "AI_MODELS"
                          ? "psychology"
                          : flag.category === "MAP_TELEMETRY"
                          ? "layers"
                          : flag.category === "ALERTS_SAFETY"
                          ? "crisis_alert"
                          : "widgets"}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-primary">{flag.name}</span>
                        <code className="px-2 py-0.5 rounded bg-surface-container text-[11px] font-mono text-secondary">
                          {flag.key}
                        </code>
                        <span className="text-[10px] font-mono text-on-surface-variant uppercase px-1.5 py-0.2 rounded bg-surface-container-high">
                          {flag.category.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                        {flag.description}
                      </p>
                      <span className="text-[10px] font-mono text-outline mt-1">
                        Added: {new Date(flag.addedAt).toLocaleDateString()}
                        {flag.promotedAt && ` · Promoted to Live: ${new Date(flag.promotedAt).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status Pill */}
                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        isLive
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : isSandbox
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-surface-container text-on-surface-variant border border-surface-container"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isLive ? "bg-emerald-600" : isSandbox ? "bg-amber-600 animate-pulse" : "bg-outline"
                        }`}
                      />
                      {isLive ? "Promoted to Live" : isSandbox ? "Sandbox Only" : "Disabled"}
                    </span>

                    {/* Quick State Toggle Buttons */}
                    <div className="flex items-center rounded-xl bg-surface-container p-0.5 border border-surface-container">
                      <button
                        type="button"
                        onClick={() => setFeatureStatus(flag.key, "SANDBOX_ONLY")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                          isSandbox
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                        title="Set to Sandbox (Only visible to Super Admin)"
                      >
                        Sandbox
                      </button>

                      <button
                        type="button"
                        onClick={() => setFeatureStatus(flag.key, "PROMOTED_TO_LIVE")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                          isLive
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                        title="Promote to Live (Immediately visible to all users on website)"
                      >
                        Push to Live
                      </button>

                      <button
                        type="button"
                        onClick={() => setFeatureStatus(flag.key, "DISABLED")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                          flag.status === "DISABLED"
                            ? "bg-outline text-white shadow-xs"
                            : "text-on-surface-variant hover:text-primary"
                        }`}
                        title="Disable feature completely"
                      >
                        Off
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteFeature(flag.key)}
                      className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                      title="Delete flag definition"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERSPECTIVE SIMULATOR */}
      {activeTab === "perspectives" && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container">
            <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
              Multi-Role Persona Matrix
            </h2>
            <p className="text-xs text-on-surface-variant font-mono mt-1">
              Test how the entire application renders under each user perspective without logging in or out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesList.map((rKey) => {
              const rDetail = ROLE_DETAILS[rKey];
              const isCurrent = rKey === role;
              return (
                <div
                  key={rKey}
                  className={`bg-surface-container-lowest p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isCurrent
                      ? "border-2 border-primary shadow-md bg-primary-container/5"
                      : "border-surface-container hover:border-outline/40"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[24px]">
                            {rDetail.icon}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-primary">{rDetail.label}</h3>
                          <span className="text-[10px] font-mono text-on-surface-variant uppercase">
                            Role: {rKey}
                          </span>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-mono font-bold uppercase">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {rDetail.desc}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
                    <button
                      type="button"
                      onClick={() => handleLaunchPerspective(rKey, "/monitor")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-mono font-semibold text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">radar</span>
                      <span>View Monitor</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLaunchPerspective(rKey, "/chat")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-mono font-semibold transition-colors"
                    >
                      <span className="material-symbols-outlined text-[15px]">chat</span>
                      <span>View AI Chat</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM TELEMETRY & AI STATUS */}
      {activeTab === "telemetry" && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container">
            <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
              Live Marine Telemetry &amp; AI Engine Status
            </h2>
            <p className="text-xs text-on-surface-variant font-mono mt-1">
              Verify pipeline grounding, cache layers, and fallback models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telemetry Sources */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container flex flex-col gap-3">
              <span className="font-bold text-sm text-primary font-mono uppercase tracking-wider">
                Telemetry Providers
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">Open-Meteo Marine Grid</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      Wave height, swell period, surface winds (15-min cadence)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                    ONLINE
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">Survey of India (GIS)</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      Cartographic coastline coordinates &amp; boundary baselines
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] font-mono font-bold">
                    CACHED (STATIC)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">INCOIS Coastal Safety Grid</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      Ocean state forecasts &amp; PFZ advisory boundaries
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                    CONNECTED
                  </span>
                </div>
              </div>
            </div>

            {/* AI Models Cascade */}
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-surface-container flex flex-col gap-3">
              <span className="font-bold text-sm text-primary font-mono uppercase tracking-wider">
                AI Fallback Engine
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">OpenRouter Free Cloud</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      Qwen 3.8 27B · Gemma 4 31B · Nemotron 3.5
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                    AUTHENTICATED
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">Local Ollama Offline</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      localhost:11434 (llama3.2 / qwen2.5:7b)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-bold">
                    STANDBY (LOCAL)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-surface-container">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-primary">Deterministic Safety Rule Core</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      Zero-hallucination mathematical threshold engine
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-bold">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD FEATURE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface-container-lowest max-w-lg w-full rounded-2xl border border-surface-container shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-primary">
                  add_box
                </span>
                <h3 className="font-bold text-sm text-primary">Add Feature to Sandbox</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-outline hover:text-primary hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {addError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateFeature} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-mono font-bold text-primary mb-1 uppercase">
                  Feature Key (Unique identifier)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. experimental_radar_sweep"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-primary mb-1 uppercase">
                  Feature Display Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Resolution Doppler Radar Sweep"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-primary mb-1 uppercase">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="UX_TOOLS">UX &amp; Tools</option>
                  <option value="AI_MODELS">AI Models &amp; Prompts</option>
                  <option value="MAP_TELEMETRY">Map Telemetry &amp; GIS</option>
                  <option value="ALERTS_SAFETY">Alerts &amp; Safety Protocols</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-primary mb-1 uppercase">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of what this feature does..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-mono text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-mono font-semibold transition-colors shadow-xs"
                >
                  Add to Sandbox
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
