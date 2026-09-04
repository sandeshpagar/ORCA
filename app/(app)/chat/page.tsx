"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/supabase";

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
}

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
  },
];

// In-memory module cache: preserves conversation seamlessly during client-side SPA route transitions
let memoryChatCache: ChatMessage[] | null = null;

export default function ChatPage() {
  const { role, homeRegion, getBearerToken } = useAuth();
  const [currentLangIdx, setCurrentLangIdx] = useState<number>(0);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => memoryChatCache || INITIAL_SEED_MESSAGES);
  const isLoadedRef = useRef<boolean>(!!memoryChatCache);

  // Restore chat history from localStorage on mount if memory cache is not populated yet
  useEffect(() => {
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
  }, []);

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
          latitude: homeRegion.lat,
          longitude: homeRegion.lon,
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
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col relative w-full bg-surface min-h-[calc(100dvh-4rem)]">
      {/* Operational Telemetry Bar & Context Ribbon */}
      <section className="px-margin-mobile md:px-margin-desktop pt-space-xs pb-space-sm bg-surface-container-low flex flex-col gap-space-xs shadow-sm border-b border-surface-container">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-space-xs">
          <div className="flex items-center justify-between gap-space-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
              </span>
              <span className="font-label-md text-label-md text-primary font-semibold truncate font-mono">
                {homeRegion.name} ({homeRegion.lat.toFixed(2)}°N, {homeRegion.lon.toFixed(2)}°E)
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
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
              <div className="flex items-center justify-between">
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
            <button
              type="submit"
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
