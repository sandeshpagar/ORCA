"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useChat, ChatMessage, LANGUAGES, SPEECH_LANG_MAP } from "@/contexts/ChatContext";
import { COASTAL_REGIONS, CoastalRegion } from "@/lib/regions";
import ConversationDrawer from "@/components/chat/ConversationDrawer";
import { getDynamicRecommendations, ROLE_DETAILS } from "@/lib/recommendations";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface AIModelOption {
  id: string;
  name: string;
  badge: string;
  desc: string;
  icon: string;
}

const AI_MODELS: AIModelOption[] = [
  {
    id: "auto",
    name: "Auto-Fallback",
    badge: "RECOMMENDED",
    desc: "Cloud Free → Local Ollama → Deterministic Engine",
    icon: "auto_mode",
  },
  {
    id: "openrouter/liquid-lfm",
    name: "Liquid LFM 2.5",
    badge: "FAST INDIC",
    desc: "Liquid AI LFM 2.5 (High Speed / Zero Scratchpad)",
    icon: "water_drop",
  },
  {
    id: "openrouter/qwen-3.8-27b",
    name: "Qwen 3.8 27B",
    badge: "FREE CLOUD",
    desc: "Alibaba Qwen 3.8 27B (OpenRouter Free Tier)",
    icon: "public",
  },
  {
    id: "openrouter/gemma-4-31b",
    name: "Gemma 4 31B",
    badge: "FREE CLOUD",
    desc: "Google Gemma 4 31B Instruct (OpenRouter Free Tier)",
    icon: "auto_awesome",
  },
  {
    id: "openrouter/nemotron-3.5",
    name: "Nemotron 3.5",
    badge: "FREE CLOUD",
    desc: "NVIDIA Nemotron 3.5 Lightning (OpenRouter Free Tier)",
    icon: "bolt",
  },
  {
    id: "ollama/local",
    name: "Local Ollama",
    badge: "OFFLINE",
    desc: "Offline localhost:11434 (llama3.2 / 0 cost)",
    icon: "terminal",
  },
  {
    id: "ollama/qwen2.5:7b",
    name: "Qwen 2.5 7B",
    badge: "FAST INDIC",
    desc: "Offline localhost:11434 (Native Devanagari / High Speed)",
    icon: "speed",
  },
  {
    id: "deterministic",
    name: "Deterministic Core",
    badge: "ZERO LLM",
    desc: "Pure Mathematical Rule Engine (Instant & Grounded)",
    icon: "shield",
  },
];

const languages = LANGUAGES.map((l) => l.label);

const NODE_META: Record<string, { label: string; icon: string }> = {
  planner: { label: "Planner", icon: "alt_route" },
  weather: { label: "Weather", icon: "air" },
  ocean: { label: "Ocean", icon: "tsunami" },
  gis: { label: "GIS", icon: "explore" },
  advisory_rag: { label: "Advisory", icon: "menu_book" },
  risk_and_suitability: { label: "Suitability & Risk", icon: "balance" },
  recommendation: { label: "Recommendation", icon: "psychology" },
};

export default function ChatPage() {
  const { role, selectInitialRole, isAdmin, setRoleAsAdmin } = useAuth();
  const {
    messages,
    conversations,
    activeConversationId,
    isLoading,
    isConversationsLoading,
    activeSectorId,
    activeRegion,
    selectedModel,
    currentLangIdx,
    isDrawerOpen,
    inputText,
    setInputText,
    setSelectedModel,
    setActiveSectorId,
    setCurrentLangIdx,
    cycleLanguage,
    setIsDrawerOpen,
    toggleDrawer,
    handleNewChat,
    handleSelectConversation,
    handleRenameConversation,
    handleDeleteConversation,
    handleSendMessage,
    clearChatHistory,
  } = useChat();

  const currentLang = LANGUAGES[currentLangIdx] || LANGUAGES[0];
  const activeLocale = SPEECH_LANG_MAP[currentLang.code] || "en-IN";

  const initialInputPrefixRef = useRef("");

  const {
    isListening,
    isSupported: isSpeechSupported,
    errorMessage: speechError,
    clearError: clearSpeechError,
    toggleListening: originalToggleListening,
    stopListening: originalStopListening,
  } = useSpeechRecognition({
    languageLocale: activeLocale,
    onTranscript: (transcript) => {
      if (!isLoading) {
        const prefix = initialInputPrefixRef.current;
        setInputText(prefix ? `${prefix}${transcript}` : transcript);
      }
    },
  });

  const stopListening = () => {
    initialInputPrefixRef.current = "";
    originalStopListening();
  };

  const toggleListening = (locale?: string) => {
    if (!isListening) {
      initialInputPrefixRef.current = inputText.trim() ? `${inputText.trim()} ` : "";
    } else {
      initialInputPrefixRef.current = "";
    }
    originalToggleListening(locale);
  };

  // If user switches language while mic is listening, cleanly stop listening
  useEffect(() => {
    if (isListening) {
      stopListening();
    }
  }, [currentLangIdx]);

  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState<boolean>(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Dynamic Role-Adaptive & Region-Aware Recommendations
  const dynamicSuggestions = useMemo(() => {
    const langCode = LANGUAGES[currentLangIdx]?.code || "en";
    return getDynamicRecommendations(role as UserRole, activeRegion, langCode);
  }, [role, activeRegion, currentLangIdx]);

  // Dynamic role-attuned composer placeholder (shows listening feedback when mic active)
  const inputPlaceholder = useMemo(() => {
    if (isListening) {
      return `🎙️ Listening in ${currentLang.name} (${currentLang.label})... Speak your query`;
    }
    switch (role) {
      case "fisher":
        return "Ask ORCA about sea-state, PFZ zones, or trawler safety...";
      case "researcher":
        return "Ask ORCA about SST gradients, chlorophyll trends, or wave spectra...";
      case "tourist":
        return "Ask ORCA about beach swimming safety, sightseeing, or tides...";
      case "authority":
        return "Ask ORCA about port signals, fairway traffic, or SAR conditions...";
      case "disaster_management":
        return "Ask ORCA about cyclone surge, gust indices, or evacuation readiness...";
      default:
        return "Ask ORCA about sea-state, swimming safety, or wind conditions...";
    }
  }, [role, isListening, currentLang]);

  const handleSelectSector = (secId: string) => {
    setActiveSectorId(secId);
    setIsSectorDropdownOpen(false);
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__orcaSendMessage = handleSendMessage;
    }
  });

  return (
    <div className="flex flex-row relative w-full h-full overflow-hidden bg-surface">
      {/* Gemini-Style Chat History Left Drawer */}
      <ConversationDrawer
        isOpen={isDrawerOpen}
        onToggle={toggleDrawer}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        conversations={conversations}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        isLoading={isConversationsLoading}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Operational Telemetry Bar & Context Ribbon */}
        <section className="px-margin-mobile md:px-margin-desktop pt-space-xs pb-space-sm bg-surface-container-low flex flex-col gap-space-xs shadow-sm border-b border-surface-container shrink-0">
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-space-xs">
            <div className="flex items-center justify-between gap-space-xs">
              <div className="flex items-center gap-2 min-w-0">
                {/* Chat History Toggle Button */}
                <button
                  type="button"
                  onClick={toggleDrawer}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all text-xs font-mono font-semibold shrink-0 ${
                    isDrawerOpen
                      ? "bg-primary text-on-primary border-primary shadow-xs"
                      : "bg-surface-container-highest hover:bg-surface-container text-on-surface-variant border-surface-container/70"
                  }`}
                  title={isDrawerOpen ? "Hide Chat History" : "Show Chat History"}
                  id="chat-drawer-toggle-btn"
                >
                  <span className="material-symbols-outlined text-[15px] leading-none shrink-0 select-none">
                    {isDrawerOpen ? "dock_to_right" : "dock_to_left"}
                  </span>
                  <span className="hidden sm:inline">History</span>
                </button>

                {/* Interactive Sector Switcher synced with Monitor */}
                <div className="relative min-w-0">
                  <button
                    type="button"
                    onClick={() => setIsSectorDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-highest hover:bg-surface-container border border-surface-container/70 transition-all text-left group"
                    title="Change active coastal monitoring sector (syncs with Monitor)"
                    id="chat-sector-switcher-btn"
                  >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="font-label-md text-label-md text-primary font-bold truncate font-mono group-hover:text-secondary transition-colors max-w-[110px] sm:max-w-[170px]">
                    {activeRegion.name}
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant hidden lg:inline">
                    ({activeRegion.center[0].toFixed(2)}°N, {activeRegion.center[1].toFixed(2)}°E)
                  </span>
                  <span className="material-symbols-outlined text-[15px] leading-none text-on-surface-variant group-hover:text-primary transition-colors shrink-0 select-none">
                    {isSectorDropdownOpen ? "expand_less" : "expand_more"}
                  </span>
                </div>
              </button>

              {/* Sector Dropdown Menu */}
              {isSectorDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSectorDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-h-80 overflow-y-auto rounded-xl bg-surface-container-lowest border border-surface-container shadow-xl p-1.5 flex flex-col gap-1 backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider font-bold text-on-surface-variant border-b border-surface-container/60 mb-0.5">
                      Select Coastal Sector ({COASTAL_REGIONS.length} Regions)
                    </div>
                    {COASTAL_REGIONS.map((region) => {
                      const isSelected = region.id === activeSectorId;
                      return (
                        <button
                          key={region.id}
                          type="button"
                          onClick={() => handleSelectSector(region.id)}
                          className={`flex items-start gap-2 p-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? "bg-primary-container/30 border border-primary/30"
                              : "hover:bg-surface-container-high/60 border border-transparent"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[15px] leading-none mt-0.5 shrink-0 select-none ${
                              isSelected ? "text-primary font-bold" : "text-on-surface-variant"
                            }`}
                          >
                            {isSelected ? "check_circle" : "location_on"}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-xs font-semibold leading-tight truncate ${
                                isSelected ? "text-primary" : "text-on-surface"
                              }`}
                            >
                              {region.name}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono truncate">
                              {region.state} · {region.center[0].toFixed(2)}°N, {region.center[1].toFixed(2)}°E
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Active AI Model Indicator */}
              <div
                className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-1 rounded-full text-on-surface-variant text-label-sm font-label-sm shrink-0 border border-surface-container/60 font-mono text-[11px]"
                title="Active AI Model (Change at bottom composer)"
              >
                <span className="material-symbols-outlined text-[15px] leading-none shrink-0 select-none text-secondary">
                  {(AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]).icon}
                </span>
                <span className="font-semibold text-primary max-w-[85px] sm:max-w-none truncate">
                  {(AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]).name}
                </span>
              </div>

              {/* Reset Conversation Button */}
              <button
                onClick={clearChatHistory}
                className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-1 rounded-full text-on-surface-variant text-label-sm font-label-sm shrink-0 hover:bg-surface-container hover:text-error transition-colors"
                id="reset-chat-btn"
                title="Reset conversation to initial state"
              >
                <span className="material-symbols-outlined text-[14px] leading-none shrink-0 select-none">refresh</span>
                <span className="text-[11px] font-mono">Reset</span>
              </button>

              {/* Multi-Language Switcher Pill */}
              <button
                onClick={cycleLanguage}
                className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-1 rounded-full text-on-surface-variant text-label-sm font-label-sm shrink-0 hover:bg-surface-container transition-colors"
                id="lang-btn"
                title="Switch language"
              >
                <span className="material-symbols-outlined text-[15px] leading-none shrink-0 select-none text-primary">translate</span>
                <span className="font-semibold text-primary">{LANGUAGES[currentLangIdx].label}</span>
                <span className="text-outline">|</span>
                <span className="text-[11px]">{LANGUAGES[(currentLangIdx + 1) % LANGUAGES.length].label}</span>
                <span className="material-symbols-outlined text-[14px] leading-none shrink-0 select-none">expand_more</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant font-mono">
            {/* Interactive Role Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-surface-container transition-colors border border-transparent hover:border-surface-container-high group"
                title="Click to switch active role and update dynamic recommendations"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary group-hover:text-primary transition-colors">
                  {ROLE_DETAILS[role as UserRole]?.icon || "badge"}
                </span>
                <span className="truncate text-xs text-on-surface-variant">
                  Role: <strong className="text-primary uppercase font-bold">{ROLE_DETAILS[role as UserRole]?.label || role}</strong>
                </span>
                <span className="material-symbols-outlined text-[12px] text-on-surface-variant/70 leading-none">
                  arrow_drop_down
                </span>
              </button>

              {isRoleDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsRoleDropdownOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-surface-container-highest border border-outline/20 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="text-[10px] font-mono uppercase font-bold text-on-surface-variant px-2.5 py-1 tracking-wider border-b border-surface-container">
                      Switch Role (Dynamic Suggestions)
                    </div>
                    {(Object.keys(ROLE_DETAILS) as UserRole[]).map((rKey) => {
                      const rInfo = ROLE_DETAILS[rKey];
                      const isSelected = rKey === role;
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => {
                            if (isAdmin) {
                              setRoleAsAdmin(rKey);
                            } else {
                              selectInitialRole(rKey);
                            }
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`flex items-start gap-2 p-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? "bg-primary-container/30 border border-primary/30"
                              : "hover:bg-surface-container-high/60 border border-transparent"
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[16px] leading-none mt-0.5 shrink-0 ${
                              isSelected ? "text-primary font-bold" : "text-on-surface-variant"
                            }`}
                          >
                            {rInfo.icon}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-semibold leading-tight ${
                                  isSelected ? "text-primary" : "text-on-surface"
                                }`}
                              >
                                {rInfo.label}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant font-mono">
                                {rInfo.badge}
                              </span>
                            </div>
                            <span className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                              {rInfo.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <span className="text-label-sm font-label-sm text-secondary font-semibold bg-secondary-fixed/50 px-1.5 py-0.5 rounded">
              OPEN-METEO LIVE
            </span>
          </div>
        </div>
      </section>

      {/* Official INCOIS / IMD Marine Broadcast Primacy Disclaimer (PRD §8) */}
      <aside
        aria-label="Official maritime broadcast priority notice"
        className="bg-amber-500/10 border-b border-amber-500/20 px-margin-mobile md:px-margin-desktop py-1.5 flex items-center justify-between text-[11px] font-mono text-amber-900 shrink-0"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="material-symbols-outlined text-[15px] text-amber-700 shrink-0">emergency</span>
          <span className="truncate">
            <strong>OFFICIAL NOTICE:</strong> AI advisory tool. Mariners must prioritize official INCOIS, IMD & Coast Guard alerts (VHF Ch 16).
          </span>
        </div>
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 text-[10px] font-bold uppercase shrink-0 ml-2">
          PRD §8
        </span>
      </aside>

      {/* Main Conversational Stream - Fully Scrollable Messages Viewport */}
      <div
        id="chat-messages-scroll-area"
        className="flex-1 min-h-0 overflow-y-auto w-full overscroll-contain"
      >
        <section
          className="px-margin-mobile md:px-margin-desktop py-space-md flex flex-col gap-space-lg max-w-3xl mx-auto w-full pb-4"
          aria-live="polite"
          aria-atomic="false"
        >
          {isConversationsLoading && messages.length === 0 ? (
            <div className="flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container animate-pulse">
              <div className="flex items-center gap-space-xs min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px] text-secondary-fixed animate-spin">
                    radar
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                    ORCA Marine Intelligence Core
                  </h2>
                  <p className="font-label-sm text-label-sm text-secondary font-mono">
                    Syncing live marine telemetry for {activeRegion.name}...
                  </p>
                </div>
              </div>
              <div className="p-space-sm rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-700 animate-pulse">verified</span>
                <span className="font-label-md text-label-md font-bold uppercase tracking-wider">
                  OPTIMAL CONDITIONS · SAFE TO OPERATE
                </span>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-4 bg-surface-container rounded w-3/4"></div>
                <div className="h-4 bg-surface-container rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex flex-col items-end gap-1 pl-space-xl">
                <div className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant mb-0.5 font-mono">
                  <span className="material-symbols-outlined text-[14px] text-secondary">mic</span>
                  <span>Input · {msg.timestamp}</span>
                </div>
                <div className="bg-primary text-on-primary px-space-md py-space-sm rounded-2xl rounded-tr-xs shadow-sm max-w-[92%]">
                  <p className="font-body-md text-body-md leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          }

          // Assistant Response Card
          const verdict = msg.safetyVerdict || "unknown";
          return (
            <article
              key={msg.id}
              className="flex flex-col gap-space-sm bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container"
            >
              {/* Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-space-xs min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-secondary-fixed">
                      sailing
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-headline-sm text-headline-sm text-primary leading-tight truncate font-bold">
                      ORCA Marine Intelligence Core
                    </h2>
                    <p className="font-label-sm text-label-sm text-on-surface-variant font-mono">
                      Observation at {msg.timestamp}
                    </p>
                  </div>
                </div>

                {/* Engine / Model Used Badge */}
                {msg.modelUsed && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-2xs shrink-0 ${
                      msg.modelUsed.startsWith("openrouter")
                        ? "bg-cyan-50 text-cyan-950 border-cyan-200"
                        : msg.modelUsed.startsWith("ollama")
                        ? "bg-amber-50 text-amber-950 border-amber-200"
                        : "bg-surface-container text-on-surface-variant border-surface-container"
                    }`}
                    title={`Generated by: ${msg.modelUsed}`}
                  >
                    <span className="material-symbols-outlined text-[13px] text-secondary">
                      {msg.modelUsed.startsWith("openrouter")
                        ? "bolt"
                        : msg.modelUsed.startsWith("ollama")
                        ? "terminal"
                        : "shield"}
                    </span>
                    <span className="capitalize">
                      {msg.modelUsed.startsWith("openrouter/")
                        ? `${msg.modelUsed.replace("openrouter/", "")} (Free Cloud)`
                        : msg.modelUsed.startsWith("ollama/")
                        ? `${msg.modelUsed.replace("ollama/", "")} (Offline Ollama)`
                        : "Deterministic Core"}
                    </span>
                  </span>
                )}
              </div>

              {/* LangGraph Agent Execution Pipeline (Phase 2B) */}
              {msg.activeNodes && msg.activeNodes.length > 0 && (
                <div className="bg-surface-container-low/80 rounded-lg p-2.5 flex flex-col gap-1.5 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-secondary">
                        hub
                      </span>
                      <span className="font-label-sm text-label-sm font-bold uppercase text-primary tracking-wider font-mono">
                        Agent Execution Chain
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-secondary font-semibold">
                      {msg.activeNodes.length} Nodes Dispatched
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {msg.activeNodes.map((nodeKey, nIdx) => {
                      const meta = NODE_META[nodeKey] || { label: nodeKey, icon: "smart_toy" };
                      return (
                        <div key={nodeKey} className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 bg-surface-container-lowest px-2 py-0.5 rounded border border-surface-container text-[11px] font-mono text-primary font-medium shadow-2xs">
                            <span className="material-symbols-outlined text-[13px] text-secondary">
                              {meta.icon}
                            </span>
                            <span>{meta.label}</span>
                            <span className="material-symbols-outlined text-[12px] text-emerald-600">
                              check_circle
                            </span>
                          </span>
                          {nIdx < msg.activeNodes!.length - 1 && (
                            <span className="text-outline text-[11px]">→</span>
                          )}
                        </div>
                      );
                    })}
                    {!msg.activeNodes.includes("ocean") && msg.activeNodes.includes("gis") && (
                      <span className="text-[10px] font-mono text-on-surface-variant italic ml-1">
                        (Ocean node omitted for land/sightseeing)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tourist Activity Suitability & Explainable Risk (Phase 2B) */}
              {msg.activitySuitability && (
                <div className="bg-surface-container-low rounded-xl p-3.5 flex flex-col gap-3 border border-surface-container">
                  {/* Suitability Rating & Score Badge */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-md text-label-md font-bold uppercase tracking-wider border shadow-2xs ${
                          msg.activitySuitability.suitability === "HIGH"
                            ? "bg-emerald-100 text-emerald-950 border-emerald-300"
                            : msg.activitySuitability.suitability === "MODERATE"
                            ? "bg-amber-100 text-amber-950 border-amber-300"
                            : msg.activitySuitability.suitability === "LOW"
                            ? "bg-orange-100 text-orange-950 border-orange-300"
                            : "bg-rose-100 text-rose-950 border-rose-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {msg.activitySuitability.suitability === "HIGH"
                            ? "verified"
                            : msg.activitySuitability.suitability === "MODERATE"
                            ? "info"
                            : msg.activitySuitability.suitability === "LOW"
                            ? "warning"
                            : "crisis_alert"}
                        </span>
                        <span>{msg.activitySuitability.suitability} SUITABILITY</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-primary bg-surface-container px-2 py-0.5 rounded">
                        Score: {msg.activitySuitability.score}/100
                      </span>
                    </div>

                    <span className="text-xs font-mono uppercase tracking-wider text-on-surface-variant bg-surface-container-high/60 px-2 py-0.5 rounded font-semibold">
                      Activity: {msg.activitySuitability.activity.replace("_", " ")}
                    </span>
                  </div>

                  {/* Optimal Time Window */}
                  <div className="bg-surface-container-lowest p-2.5 rounded-lg border border-surface-container flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5 shrink-0">
                      schedule
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-mono uppercase font-bold text-on-surface-variant">
                        Recommended Operational Window
                      </span>
                      <span className="text-body-sm text-primary font-medium">
                        {msg.activitySuitability.best_time_window}
                      </span>
                    </div>
                  </div>

                  {/* "Why?" Explainable Factors Breakdown */}
                  {msg.activitySuitability.factors && msg.activitySuitability.factors.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-mono uppercase font-bold text-on-surface-variant tracking-wider">
                        Why? — Real-time Factor Breakdown
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {msg.activitySuitability.factors.map((f, fIdx) => (
                          <div
                            key={fIdx}
                            className="bg-surface-container-lowest p-2 rounded-lg border border-surface-container flex flex-col gap-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-primary">{f.factor}</span>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                  f.impact === "critical"
                                    ? "bg-rose-100 text-rose-800"
                                    : f.impact === "warning"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {f.value} · {f.impact}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant leading-tight">
                              {f.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings Banner */}
                  {msg.riskResult?.warnings && msg.riskResult.warnings.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-start gap-2 text-rose-950">
                      <span className="material-symbols-outlined text-[18px] text-rose-600 shrink-0 mt-0.5">
                        warning
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-mono uppercase font-bold text-rose-800">
                          Official Coastal Warnings &amp; Advisories
                        </span>
                        <ul className="list-disc list-inside text-xs leading-relaxed mt-0.5">
                          {msg.riskResult.warnings.map((w, wIdx) => (
                            <li key={wIdx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Safety Verdict Banner */}
              {verdict !== "unknown" && !msg.activitySuitability && (
                <div
                  className={`p-space-sm rounded-lg flex items-start gap-space-xs border ${
                    verdict === "danger"
                      ? "bg-error-container text-on-error-container border-error/30"
                      : verdict === "caution"
                      ? "bg-amber-100 text-amber-950 border-amber-200"
                      : "bg-emerald-50 text-emerald-950 border-emerald-200"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
                    {verdict === "danger" ? "crisis_alert" : verdict === "caution" ? "warning" : "verified"}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-bold uppercase tracking-wider">
                      {verdict === "danger"
                        ? "DANGER · GALE SWELL ADVISORY"
                        : verdict === "caution"
                        ? "CAUTION ADVISED · MODERATE SWELL"
                        : "OPTIMAL CONDITIONS · SAFE TO OPERATE"}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Marine Metrics Snapshot Widget */}
              {msg.metrics && (
                <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-xs border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm font-semibold uppercase text-primary tracking-wider font-mono">
                      Telemetry Snapshot (Open-Meteo Marine)
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold font-mono">
                      {msg.dataSource?.reliability || "LIVE"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-space-xs pt-1">
                    <div className="bg-surface-container-lowest p-2 rounded-md flex flex-col border border-surface-container">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Wave Swell</span>
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {msg.metrics.wave_height_m != null ? msg.metrics.wave_height_m : "—"}
                        <span className="text-xs font-normal text-on-surface-variant">m</span>
                      </span>
                      <span className="font-label-sm text-label-sm text-tertiary font-semibold flex items-center font-mono">
                        {msg.metrics.wave_period_s ? `${msg.metrics.wave_period_s}s period` : "Live Wave"}
                      </span>
                    </div>
                    <div className="bg-surface-container-lowest p-2 rounded-md flex flex-col border border-surface-container">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Surface Wind</span>
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {msg.metrics.wind_speed_kmh != null ? msg.metrics.wind_speed_kmh : "—"}
                        <span className="text-xs font-normal text-on-surface-variant">km/h</span>
                      </span>
                      <span className="font-label-sm text-label-sm text-amber-800 font-semibold font-mono">
                        Dir {msg.metrics.wind_direction_deg || 0}°
                      </span>
                    </div>
                    <div className="bg-surface-container-lowest p-2 rounded-md flex flex-col border border-surface-container">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Air Temp</span>
                      <span className="font-data-metric text-data-metric text-primary font-mono">
                        {msg.metrics.temperature_c != null ? msg.metrics.temperature_c : "—"}
                        <span className="text-xs font-normal text-on-surface-variant">°C</span>
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary font-semibold font-mono truncate">
                        {msg.metrics.weather_description || "Normal"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-line font-body-sm text-body-sm text-on-surface leading-relaxed pt-1">
                {msg.content}
              </div>

              {/* Multi-Source Provenance & Data Grounding (PRD §8) */}
              {msg.sourcesList && msg.sourcesList.length > 0 ? (
                <div className="bg-surface-container-high/50 rounded-lg p-3 flex flex-col gap-2 mt-2 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">
                        verified
                      </span>
                      <span className="font-label-sm text-label-sm font-bold uppercase text-primary tracking-wider font-mono">
                        Multi-Source Grounding &amp; Provenance
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-secondary font-semibold">
                      {msg.sourcesList.length} Verified Sources
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 divide-y divide-surface-container">
                    {msg.sourcesList.map((src, sIdx) => (
                      <div key={sIdx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-primary truncate">{src.name}</span>
                            <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-1 rounded uppercase">
                              {src.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant font-mono truncate">
                            {src.attribution}
                          </p>
                        </div>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                            src.reliability === "LIVE"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : src.reliability === "CACHED"
                              ? "bg-cyan-100 text-cyan-900 border border-cyan-300"
                              : "bg-amber-100 text-amber-900 border border-amber-300"
                          }`}
                        >
                          {src.reliability}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : msg.dataSource ? (
                <div className="bg-surface-container-high/50 rounded-lg p-3 flex flex-col gap-1.5 mt-2 border border-surface-container">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-secondary">
                        verified
                      </span>
                      <span className="font-label-sm text-label-sm font-bold uppercase text-primary tracking-wider font-mono">
                        Source Provenance
                      </span>
                    </div>
                    {/* Explicit LIVE / CACHED / DEMO honesty tag */}
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        msg.dataSource.reliability === "LIVE"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : msg.dataSource.reliability === "CACHED"
                          ? "bg-cyan-100 text-cyan-900 border border-cyan-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {msg.dataSource.reliability} DATA
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant font-mono">
                    Provider: {msg.dataSource.name} · {msg.dataSource.attribution}
                  </p>
                </div>
              ) : null}
            </article>
            );
          }))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="bg-surface-container-lowest rounded-xl p-space-md border border-surface-container flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
              <span className="text-body-sm text-primary font-mono font-semibold">
                Executing LangGraph Multi-Agent Pipeline...
              </span>
            </div>
            <div className="flex items-center gap-1.5 pl-8 text-xs font-mono text-on-surface-variant flex-wrap">
              <span className="text-secondary font-bold">Planner</span>
              <span>→</span>
              <span>Weather / Ocean / GIS / Advisory</span>
              <span>→</span>
              <span>Deterministic Suitability &amp; Risk</span>
              <span>→</span>
              <span>Recommendation</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </section>
    </div>

      {/* Docked Prompt Input Dock & Quick Chips */}
      <footer className="shrink-0 bg-surface/95 backdrop-blur-xl border-t border-surface-container p-3 z-20">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-2">
          {/* Quick Suggestion Chips (Role & Region Adaptive) */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {dynamicSuggestions.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => {
                  stopListening();
                  handleSendMessage(chip);
                }}
                type="button"
                className="whitespace-nowrap px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-[11px] text-primary font-medium border border-surface-container transition-colors shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Active Voice Input Feedback Banner */}
          {isListening && (
            <div
              role="status"
              aria-live="assertive"
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-800 text-xs font-mono animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                </span>
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  Listening in {currentLang.name} ({currentLang.label})
                </span>
                <span className="text-[11px] text-on-surface-variant hidden sm:inline">
                  — Speak clearly into microphone
                </span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                aria-label="Stop speech recognition"
                className="text-[10px] font-bold uppercase underline hover:text-rose-900 transition-colors"
              >
                Stop Listening
              </button>
            </div>
          )}

          {speechError && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] font-mono animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[15px] text-amber-600 shrink-0">warning</span>
                <span className="truncate">{speechError}</span>
              </div>
              <button
                type="button"
                onClick={clearSpeechError}
                aria-label="Dismiss error notice"
                className="text-amber-800 hover:text-amber-950 text-xs px-1 font-bold shrink-0 ml-2"
                title="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              stopListening();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              aria-label="Marine advisory query input"
              className={`flex-1 px-4 py-2.5 rounded-full bg-surface-container-low border text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline transition-all ${
                isListening
                  ? "border-rose-400 ring-2 ring-rose-400/30 bg-rose-50/15"
                  : "border-surface-container"
              }`}
            />

            {/* AI Model Selector Dropdown — Placed right to the left of the mic button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                aria-label="Select AI reasoning model"
                aria-expanded={isModelDropdownOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-surface-container-low hover:bg-surface-container border border-surface-container text-on-surface-variant text-xs font-mono transition-colors shadow-2xs"
                id="model-selector-btn"
                title="Choose AI Model & Engine (Free OpenRouter / Local Ollama)"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  {(AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]).icon}
                </span>
                <span className="font-semibold text-primary text-[11px] hidden sm:inline max-w-[110px] truncate">
                  {(AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]).name}
                </span>
                <span className="material-symbols-outlined text-[14px] text-outline">
                  {isModelDropdownOpen ? "expand_more" : "expand_less"}
                </span>
              </button>

              {/* Upward Dropdown Menu */}
              {isModelDropdownOpen && (
                <div
                  className="absolute right-0 bottom-full mb-2 w-72 sm:w-80 bg-surface-container-lowest rounded-xl shadow-2xl border border-surface-container p-1.5 z-50 flex flex-col gap-1 text-left animate-in fade-in zoom-in-95 duration-100"
                  id="model-dropdown-menu"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono text-on-surface-variant uppercase font-bold border-b border-surface-container flex items-center justify-between">
                    <span>Select AI Engine</span>
                    <span className="text-secondary font-bold">100% FREE</span>
                  </div>
                  <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                    {AI_MODELS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectModel(m.id)}
                        className={`flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                          selectedModel === m.id
                            ? "bg-secondary-fixed/40 border border-secondary/30"
                            : "hover:bg-surface-container"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5 shrink-0">
                          {m.icon}
                        </span>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-primary">{m.name}</span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                m.badge === "RECOMMENDED"
                                  ? "bg-secondary/20 text-secondary"
                                  : m.badge === "FREE CLOUD"
                                  ? "bg-cyan-100 text-cyan-900"
                                  : m.badge === "OFFLINE"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant leading-tight mt-0.5">
                            {m.desc}
                          </p>
                        </div>
                        {selectedModel === m.id && (
                          <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5 shrink-0">
                            check
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Multilingual Voice Input Microphone Button */}
            <button
              type="button"
              onClick={() => toggleListening(activeLocale)}
              disabled={isLoading}
              aria-label={
                isListening
                  ? `Stop voice recording in ${currentLang.name}`
                  : `Start voice input in ${currentLang.name}`
              }
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all relative ${
                isListening
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md ring-4 ring-rose-400/40 border border-rose-500 animate-pulse"
                  : "bg-surface-container-low hover:bg-surface-container border border-surface-container text-on-surface-variant hover:text-primary shadow-2xs group"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              title={
                !isSpeechSupported
                  ? "Voice input is not supported in this browser (Use Chrome/Edge/Safari)"
                  : isListening
                  ? `Listening in ${currentLang.name}... Click to stop`
                  : `Voice input in ${currentLang.name} (${currentLang.label})`
              }
              id="voice-mic-btn"
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-transform ${
                  isListening ? "animate-bounce" : "group-hover:scale-110"
                }`}
              >
                {isListening ? "graphic_eq" : "mic"}
              </span>

              {/* Live recording beacon indicator */}
              {isListening && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
              )}
            </button>

            <button
              type="submit"
              id="chat-send-btn"
              disabled={!inputText.trim() || isLoading}
              aria-label="Send advisory query"
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container disabled:opacity-50 transition-colors shrink-0 shadow-sm"
              title="Send query"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      </footer>
    </div>
  </div>
  );
}
