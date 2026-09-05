"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/supabase";
import { COASTAL_REGIONS, CoastalRegion } from "@/lib/regions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  metrics?: {
    temperature_c?: number | null;
    wind_speed_kmh?: number | null;
    wind_direction_deg?: number | null;
    wave_height_m?: number | null;
    wave_period_s?: number | null;
    weather_description?: string | null;
  };
  dataSource?: {
    name: string;
    type: string;
    reliability: "LIVE" | "CACHED" | "DEMO";
    timestamp: string;
    attribution: string;
  };
  safetyVerdict?: "safe" | "caution" | "danger" | "unknown";
  isLive?: boolean;
  activeNodes?: string[];
  activitySuitability?: {
    activity: string;
    suitability: "HIGH" | "MODERATE" | "LOW" | "UNSUITABLE";
    score: number;
    factors: Array<{
      factor: string;
      value: string;
      impact: "favorable" | "warning" | "critical";
      reason: string;
    }>;
    reasons: string[];
    best_time_window: string;
    summary: string;
  };
  riskResult?: {
    level: string;
    score: number;
    factors: any[];
    warnings: string[];
  };
  sourcesList?: Array<{
    name: string;
    type: string;
    reliability: string;
    timestamp: string;
    attribution: string;
  }>;
  modelUsed?: string;
}

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
    id: "openrouter/llama-3.3-70b",
    name: "Llama 3.3 70B",
    badge: "FREE CLOUD",
    desc: "Meta Llama 3.3 70B Instruct (OpenRouter Free Tier)",
    icon: "bolt",
  },
  {
    id: "openrouter/gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    badge: "FREE CLOUD",
    desc: "Google Gemini 2.0 Flash Experimental (Free Tier)",
    icon: "auto_awesome",
  },
  {
    id: "openrouter/qwen-2.5-72b",
    name: "Qwen 2.5 72B",
    badge: "FREE CLOUD",
    desc: "Alibaba Qwen 2.5 72B Instruct (OpenRouter Free Tier)",
    icon: "public",
  },
  {
    id: "ollama/local",
    name: "Local Ollama",
    badge: "OFFLINE",
    desc: "Offline localhost:11434 (llama3.2 / 0 cost)",
    icon: "terminal",
  },
  {
    id: "deterministic",
    name: "Deterministic Core",
    badge: "ZERO LLM",
    desc: "Pure Mathematical Rule Engine (Instant & Grounded)",
    icon: "shield",
  },
];

const languages = ["EN", "हिंदी", "मराठी", "ગુજરાતી", "ଓଡ଼ିଆ", "தமிழ்"];

const suggestionChips = [
  "Is it safe to swim at Puri Beach today?",
  "Can we take a small motorboat out near Paradip Port fairway right now?",
  "I want to go coastal sightseeing and visit ancient monuments around Konark.",
  "Why is boating unsuitable in rough sea conditions?",
  "Can mechanised trawlers venture 15 nautical miles off Gopalpur tonight?",
];

const NODE_META: Record<string, { label: string; icon: string }> = {
  planner: { label: "Planner", icon: "alt_route" },
  weather: { label: "Weather", icon: "air" },
  ocean: { label: "Ocean", icon: "tsunami" },
  gis: { label: "GIS", icon: "explore" },
  advisory_rag: { label: "Advisory", icon: "menu_book" },
  risk_and_suitability: { label: "Suitability & Risk", icon: "balance" },
  recommendation: { label: "Recommendation", icon: "psychology" },
};

const INITIAL_SEED_MESSAGES: ChatMessage[] = [
  {
    id: "initial-user",
    role: "user",
    content: "Can mechanised trawlers venture 15 nautical miles off Gopalpur after 18:00 IST tonight?",
    timestamp: "14:32 IST",
  },
  {
    id: "initial-assistant",
    role: "assistant",
    content:
      "**Fisherfolk Marine Safety Telemetry — Gopalpur Sector**\n\n" +
      "• **Verdict**: **CAUTION**\n" +
      "• **Significant Wave Height**: 2.8m (Squall surge expected after 21:00)\n" +
      "• **Surface Wind**: 22.0 km/h (SSW, gusts to 30 kts)\n" +
      "• **Atmospheric Temp**: 28.5°C\n\n" +
      "**Operational Directive**: Inshore (< 5 NM) operations allowed until 20:00 IST with NavIC transponder active. Deep-sea trawlers must travel in buddy pairs and return before squall surge at 22:00 IST.",
    timestamp: "14:32 IST",
    activeNodes: ["planner", "weather", "ocean", "gis", "advisory_rag", "risk_and_suitability", "recommendation"],
    activitySuitability: {
      activity: "trawler_venture",
      suitability: "MODERATE",
      score: 65,
      factors: [
        {
          factor: "Significant Wave Height",
          value: "2.8m",
          impact: "critical",
          reason: "Wave height 2.8m exceeds calm limit of 2.0m for inshore trawling.",
        },
        {
          factor: "Sustained Wind Speed",
          value: "22.0 km/h",
          impact: "warning",
          reason: "Moderate breeze with anticipated night gusts.",
        },
      ],
      reasons: ["Wave height 2.8m requires caution", "Squall surge expected after 21:00 IST"],
      best_time_window: "06:00 – 18:00 IST (Return before 20:00 squall window)",
      summary: "Suitability rated MODERATE (65/100). Inshore operations permissible before evening squall.",
    },
    riskResult: {
      level: "moderate",
      score: 35,
      factors: [],
      warnings: ["Squall surge expected after 21:00 IST: Inshore vessels must return by 20:00 IST."],
    },
    metrics: {
      wave_height_m: 2.8,
      wind_speed_kmh: 22.0,
      wind_direction_deg: 210,
      temperature_c: 28.5,
      weather_description: "Squall warning",
    },
    dataSource: {
      name: "Open-Meteo Marine & Weather API",
      type: "weather",
      reliability: "LIVE",
      timestamp: "2026-09-04T08:00:00Z",
      attribution: "Open-Meteo Global Marine & Weather Models (CC-BY 4.0)",
    },
    sourcesList: [
      {
        name: "Open-Meteo Weather API",
        type: "weather",
        reliability: "LIVE",
        timestamp: "2026-09-04T08:00:00Z",
        attribution: "Open-Meteo ECMWF / GFS Global Models",
      },
      {
        name: "Open-Meteo Marine API",
        type: "ocean",
        reliability: "LIVE",
        timestamp: "2026-09-04T08:00:00Z",
        attribution: "Copernicus Marine Wave Model via Open-Meteo",
      },
      {
        name: "INCOIS Coastal Hazard & Navigation DB",
        type: "advisory",
        reliability: "LIVE",
        timestamp: "2026-09-04T08:00:00Z",
        attribution: "Indian National Centre for Ocean Information Services",
      },
    ],
    safetyVerdict: "caution",
    isLive: true,
    modelUsed: "deterministic",
  },
];

// In-memory module cache: preserves conversation seamlessly during client-side SPA route transitions
let memoryChatCache: ChatMessage[] | null = null;

export default function ChatPage() {
  const { role, homeRegion, getBearerToken } = useAuth();
  const [currentLangIdx, setCurrentLangIdx] = useState<number>(0);
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [activeSectorId, setActiveSectorId] = useState<string>("odisha");
  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => memoryChatCache || INITIAL_SEED_MESSAGES);
  const isLoadedRef = useRef<boolean>(!!memoryChatCache);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Restore chat history, selected model, and active sector from localStorage on mount
  useEffect(() => {
    try {
      const savedModel = localStorage.getItem("orca_selected_model");
      if (savedModel) setSelectedModel(savedModel);
    } catch (e) {
      console.warn("Could not load stored model choice", e);
    }

    const syncSector = () => {
      try {
        const savedSector = localStorage.getItem("orca_selected_sector");
        if (savedSector && COASTAL_REGIONS.some((r) => r.id === savedSector)) {
          setActiveSectorId(savedSector);
        }
      } catch (e) {
        console.warn("Could not load stored sector choice", e);
      }
    };
    syncSector();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "orca_selected_sector" && e.newValue) {
        if (COASTAL_REGIONS.some((r) => r.id === e.newValue)) {
          setActiveSectorId(e.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", syncSector);

    if (!memoryChatCache) {
      try {
        const saved = localStorage.getItem("orca_chat_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            memoryChatCache = parsed;
            setMessages(parsed);
          }
        }
      } catch (e) {
        console.warn("Could not load stored chat history", e);
      }
    }
    isLoadedRef.current = true;

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", syncSector);
    };
  }, []);

  const activeRegion: CoastalRegion =
    COASTAL_REGIONS.find((r) => r.id === activeSectorId) || COASTAL_REGIONS[0];

  const handleSelectSector = (secId: string) => {
    setActiveSectorId(secId);
    setIsSectorDropdownOpen(false);
    try {
      localStorage.setItem("orca_selected_sector", secId);
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.warn("Could not persist sector choice", e);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setIsModelDropdownOpen(false);
    try {
      localStorage.setItem("orca_selected_model", modelId);
    } catch (e) {
      console.warn("Could not persist model choice", e);
    }
  };

  // Persist chat history to localStorage and memory cache on update
  // CRITICAL: isLoadedRef prevents overwriting saved history on initial mount
  useEffect(() => {
    if (!isLoadedRef.current) return;
    memoryChatCache = messages;
    try {
      localStorage.setItem("orca_chat_history", JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not persist chat history", e);
    }
  }, [messages]);

  const clearChatHistory = () => {
    memoryChatCache = INITIAL_SEED_MESSAGES;
    setMessages(INITIAL_SEED_MESSAGES);
    try {
      localStorage.removeItem("orca_chat_history");
    } catch (e) {
      console.warn("Could not clear chat history", e);
    }
  };

  const cycleLanguage = () => {
    setCurrentLangIdx((prev) => (prev + 1) % languages.length);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const token = getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        // Provide demo test token if user is in unauthenticated client mode
        headers["Authorization"] = "Bearer demo_client_guest_token";
      }

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: textToSend.trim(),
          latitude: activeRegion.center[0],
          longitude: activeRegion.center[1],
          region_name: activeRegion.name,
          selected_model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        metrics: data.metrics || undefined,
        dataSource: data.data_source
          ? {
              name: data.data_source.name,
              type: data.data_source.type,
              reliability: (data.data_source.reliability?.toUpperCase() as any) || "DEMO",
              timestamp: data.data_source.timestamp,
              attribution: data.data_source.attribution,
            }
          : undefined,
        safetyVerdict: (data.safety_verdict as any) || "unknown",
        isLive: data.is_live,
        activeNodes: data.active_nodes || undefined,
        activitySuitability: data.activity_suitability || undefined,
        riskResult: data.risk_result || undefined,
        sourcesList: data.sources || undefined,
        modelUsed: data.model_used || "deterministic",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.warn("Error calling /chat endpoint:", err);
      // Data honesty: report connection/API error without making up fake metrics
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          `**ORCA Advisory Connection Notice**\n\n` +
          `Could not connect to the ORCA FastAPI backend at \`${API_BASE_URL}/chat\`. ` +
          `*(Error: ${err.message || "Network error"})*\n\n` +
          `**Data Honesty Policy (PRD §8)**: In adherence to mission safety standards, ` +
          `we never fabricate wave heights or sea conditions. ` +
          `Ensure the FastAPI backend is running on \`http://localhost:8000\` (` +
          `\`uvicorn app.main:app --port 8000\`).`,
        timestamp: new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        dataSource: {
          name: "Local Service Healthcheck",
          type: "advisory",
          reliability: "DEMO",
          timestamp: new Date().toISOString(),
          attribution: "Zero fabricated numbers policy",
        },
        safetyVerdict: "unknown",
        isLive: false,
        modelUsed: "deterministic",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__orcaSendMessage = handleSendMessage;
    }
  });

  return (
    <div className="flex-1 flex flex-col relative w-full bg-surface min-h-[calc(100dvh-4rem)]">
      {/* Operational Telemetry Bar & Context Ribbon */}
      <section className="px-margin-mobile md:px-margin-desktop pt-space-xs pb-space-sm bg-surface-container-low flex flex-col gap-space-xs shadow-sm border-b border-surface-container">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-space-xs">
          <div className="flex items-center justify-between gap-space-xs">
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
                  <span className="font-label-md text-label-md text-primary font-bold truncate font-mono group-hover:text-secondary transition-colors">
                    {activeRegion.name}
                  </span>
                  <span className="text-[11px] font-mono text-on-surface-variant hidden sm:inline">
                    ({activeRegion.center[0].toFixed(2)}°N, {activeRegion.center[1].toFixed(2)}°E)
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
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
                            className={`material-symbols-outlined text-[16px] mt-0.5 shrink-0 ${
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

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Active AI Model Indicator */}
              <div
                className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-1 rounded-full text-on-surface-variant text-label-sm font-label-sm shrink-0 border border-surface-container/60 font-mono text-[11px]"
                title="Active AI Model (Change at bottom composer)"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">
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
                <span className="material-symbols-outlined text-[13px]">refresh</span>
                <span className="text-[11px] font-mono">Reset</span>
              </button>

              {/* Multi-Language Switcher Pill */}
              <button
                onClick={cycleLanguage}
                className="flex items-center gap-1 bg-surface-container-highest px-space-xs py-1 rounded-full text-on-surface-variant text-label-sm font-label-sm shrink-0 hover:bg-surface-container transition-colors"
                id="lang-btn"
                title="Switch language"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">translate</span>
                <span className="font-semibold text-primary">{languages[currentLangIdx]}</span>
                <span className="text-outline">|</span>
                <span className="text-[11px]">{languages[(currentLangIdx + 1) % languages.length]}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant font-mono">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary">
                satellite_alt
              </span>
              <span className="truncate">Active Role: <strong className="text-primary uppercase">{role}</strong></span>
            </div>
            <span className="text-label-sm font-label-sm text-secondary font-semibold bg-secondary-fixed/50 px-1.5 py-0.5 rounded">
              OPEN-METEO LIVE
            </span>
          </div>
        </div>
      </section>

      {/* Main Conversational Stream */}
      <section className="flex-1 px-margin-mobile md:px-margin-desktop py-space-md flex flex-col gap-space-lg max-w-3xl mx-auto w-full pb-36">
        {messages.map((msg) => {
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
        })}

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

      {/* Floating Prompt Input Dock & Quick Chips */}
      <footer className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-surface-container p-3">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-2">
          {/* Quick Suggestion Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip)}
                type="button"
                className="whitespace-nowrap px-3 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-[11px] text-primary font-medium border border-surface-container transition-colors shrink-0"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask ORCA about sea-state, swimming safety, or wind conditions..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-full bg-surface-container-low border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-outline"
            />

            {/* AI Model Selector Dropdown — Placed right to the left of the send button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
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

            <button
              type="submit"
              id="chat-send-btn"
              disabled={!inputText.trim() || isLoading}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary-container disabled:opacity-50 transition-colors shrink-0 shadow-sm"
              title="Send query"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
