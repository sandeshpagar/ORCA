"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/supabase";
import { COASTAL_REGIONS, CoastalRegion } from "@/lib/regions";
import { ConversationItem } from "@/components/chat/ConversationDrawer";

export interface ChatMessage {
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
    factors: string[];
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

export interface ChatContextType {
  messages: ChatMessage[];
  conversations: ConversationItem[];
  activeConversationId: string;
  isLoading: boolean;
  isConversationsLoading: boolean;
  activeSectorId: string;
  activeRegion: CoastalRegion;
  selectedModel: string;
  currentLangIdx: number;
  isDrawerOpen: boolean;
  inputText: string;
  userKey: string;
  setInputText: (text: string) => void;
  setSelectedModel: (model: string) => void;
  setActiveSectorId: (sectorId: string) => void;
  setCurrentLangIdx: (idx: number) => void;
  cycleLanguage: () => void;
  setIsDrawerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  toggleDrawer: () => void;
  handleNewChat: () => void;
  handleSelectConversation: (convId: string) => Promise<void>;
  handleRenameConversation: (convId: string, newTitle: string) => Promise<void>;
  handleDeleteConversation: (convId: string) => Promise<void>;
  handleSendMessage: (queryText?: string) => Promise<void>;
  clearChatHistory: () => void;
}

export const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "hi", label: "हिंदी", name: "Hindi" },
  { code: "mr", label: "मराठी", name: "Marathi" },
  { code: "gu", label: "ગુજરાતી", name: "Gujarati" },
  { code: "or", label: "ଓડ଼ିଆ", name: "Odia" },
  { code: "ta", label: "தமிழ்", name: "Tamil" },
  { code: "te", label: "తెలుగు", name: "Telugu" },
];

export const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  or: "or-IN",
  ta: "ta-IN",
  te: "te-IN",
};

export const getConversationsKey = (key: string) => `orca_conversations_${key}`;
export const getActiveConvKey = (key: string) => `orca_active_conv_${key}`;
export const getChatHistoryKey = (key: string) => `orca_chat_history_${key}`;
export const getConvMessagesKey = (key: string, convId: string) => `orca_conv_${key}_${convId}`;

// In-memory module cache keyed by userKey: preserves conversation seamlessly during client-side SPA route transitions
const memoryChatCacheMap: Record<string, ChatMessage[]> = {};

export const getInitialSeedMessagesForRole = (currentRole: string, activeRegion: CoastalRegion): ChatMessage[] => {
  const timeStr = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const regionName = activeRegion.name;
  const latStr = activeRegion.center[0].toFixed(2);
  const lonStr = activeRegion.center[1].toFixed(2);

  return [
    {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: `🌊 **ORCA Marine Advisory Ready — ${regionName}**\n\nLive telemetry connected for **${regionName}** (${latStr}°N, ${lonStr}°E).\n\nAsk about sea state, wave heights, fishing zones, or coastal tourism safety.`,
      timestamp: timeStr,
      safetyVerdict: "safe",
      isLive: true,
      modelUsed: "deterministic",
    },
  ];
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { role, user, getBearerToken } = useAuth();

  const userKey = useMemo(() => {
    const rolePart = role || "general";
    if (user?.id) return `usr_${user.id}_${rolePart}`;
    if (user?.email) return `email_${user.email.replace(/[^a-zA-Z0-9]/g, "_")}_${rolePart}`;
    return `role_${rolePart}`;
  }, [user?.id, user?.email, role]);

  const [activeSectorId, setActiveSectorIdState] = useState<string>("odisha");
  const [selectedModel, setSelectedModelState] = useState<string>("auto");
  const [currentLangIdx, setCurrentLangIdxState] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConversationsLoading, setIsConversationsLoading] = useState<boolean>(false);
  const [activeConversationId, setActiveConversationId] = useState<string>("default-conv");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadedUserKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef<{ [convId: string]: boolean }>({});
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const activeRegion: CoastalRegion = useMemo(() => {
    return COASTAL_REGIONS.find((r) => r.id === activeSectorId) || COASTAL_REGIONS[0];
  }, [activeSectorId]);

  // Restore client preferences on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedModel = localStorage.getItem("orca_selected_model");
      if (savedModel) setSelectedModelState(savedModel);
    } catch (e) {}

    try {
      const savedLang = localStorage.getItem("orca_selected_language");
      if (savedLang) {
        const langIdx = LANGUAGES.findIndex((l) => l.code === savedLang);
        if (langIdx !== -1) setCurrentLangIdxState(langIdx);
      }
    } catch (e) {}

    try {
      const savedSector = localStorage.getItem("orca_selected_sector");
      if (savedSector && COASTAL_REGIONS.some((r) => r.id === savedSector)) {
        setActiveSectorIdState(savedSector);
      }
    } catch (e) {}

    if (window.innerWidth < 768) {
      setIsDrawerOpen(false);
    } else {
      try {
        const savedDrawer = localStorage.getItem("orca_chat_drawer_open");
        if (savedDrawer !== null) {
          setIsDrawerOpen(savedDrawer === "true");
        }
      } catch (e) {}
    }
  }, []);

  // Cleanly abort in-flight network requests on unmount
  useEffect(() => {
    return () => {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
    };
  }, []);

  const setActiveSectorId = (secId: string) => {
    setActiveSectorIdState(secId);
    try {
      localStorage.setItem("orca_selected_sector", secId);
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}
  };

  const setSelectedModel = (modelId: string) => {
    setSelectedModelState(modelId);
    try {
      localStorage.setItem("orca_selected_model", modelId);
    } catch (e) {}
  };

  const setCurrentLangIdx = (idx: number) => {
    setCurrentLangIdxState(idx);
    try {
      localStorage.setItem("orca_selected_language", LANGUAGES[idx]?.code || "en");
    } catch (e) {}
  };

  const cycleLanguage = () => {
    setCurrentLangIdxState((prev) => {
      const next = (prev + 1) % LANGUAGES.length;
      try {
        localStorage.setItem("orca_selected_language", LANGUAGES[next].code);
      } catch (e) {}
      return next;
    });
  };

  const toggleDrawer = () => {
    setIsDrawerOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("orca_chat_drawer_open", String(next));
      } catch (e) {}
      return next;
    });
  };

  // Synchronize conversations for active userKey
  const loadConversations = useCallback(
    async (currentKey: string) => {
      setIsConversationsLoading(true);
      let localList: ConversationItem[] = [];
      const storageKey = getConversationsKey(currentKey);

      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          localList = JSON.parse(saved);
        }
      } catch (e) {}

      // Check remote conversations if authenticated
      try {
        const token = getBearerToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/chat/conversations`, { headers });
        if (res.ok) {
          const remoteList: ConversationItem[] = await res.json();
          const map = new Map<string, ConversationItem>();
          remoteList.forEach((c) => map.set(c.id, c));
          localList.forEach((c) => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          localList = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          try {
            localStorage.setItem(storageKey, JSON.stringify(localList));
          } catch (e) {}
        }
      } catch (e) {
        console.warn("Could not fetch remote conversations, using local fallback", e);
      }

      let activeId = "";
      try {
        activeId = localStorage.getItem(getActiveConvKey(currentKey)) || "";
      } catch (e) {}

      if (localList.length === 0) {
        // Seed default initial welcome conversation for this role and region
        const currentRole = role || "general";
        const initialSeed = getInitialSeedMessagesForRole(currentRole, activeRegion);
        const defaultConvId = `conv-${currentKey}-${Date.now()}`;
        activeId = defaultConvId;
        const seedTitle = `Marine Advisory — ${activeRegion.name}`;
        const seedConv: ConversationItem = {
          id: defaultConvId,
          title: seedTitle,
          created_at: new Date().toISOString(),
          message_count: initialSeed.length,
          last_message: initialSeed[0]?.content?.slice(0, 60) || "Welcome to ORCA",
        };
        localList = [seedConv];
        try {
          localStorage.setItem(storageKey, JSON.stringify(localList));
          localStorage.setItem(getConvMessagesKey(currentKey, defaultConvId), JSON.stringify(initialSeed));
          localStorage.setItem(getActiveConvKey(currentKey), defaultConvId);
        } catch (e) {}
        setMessages(initialSeed);
        memoryChatCacheMap[currentKey] = initialSeed;
      } else {
        if (!activeId || !localList.some((c) => c.id === activeId)) {
          activeId = localList[0].id;
        }

        let loadedMessages: ChatMessage[] | null = null;
        if (memoryChatCacheMap[currentKey]) {
          loadedMessages = memoryChatCacheMap[currentKey];
        }
        if (!loadedMessages) {
          try {
            const cached = localStorage.getItem(getConvMessagesKey(currentKey, activeId));
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedMessages = parsed;
              }
            }
          } catch (e) {}
        }
        if (!loadedMessages) {
          loadedMessages = getInitialSeedMessagesForRole(role || "general", activeRegion);
        }
        setMessages(loadedMessages);
        memoryChatCacheMap[currentKey] = loadedMessages;
        try {
          localStorage.setItem(getActiveConvKey(currentKey), activeId);
        } catch (e) {}
      }

      setConversations(localList);
      setActiveConversationId(activeId);
      loadedUserKeyRef.current = currentKey;
      setIsConversationsLoading(false);
    },
    [role, activeRegion, getBearerToken]
  );

  useEffect(() => {
    loadConversations(userKey);
  }, [userKey, loadConversations]);

  const handleNewChat = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
      setIsLoading(false);
    }
    const newId = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setActiveConversationId(newId);
    try {
      localStorage.setItem(getActiveConvKey(userKey), newId);
    } catch (e) {}

    const welcomeMsg = getInitialSeedMessagesForRole(role || "general", activeRegion)[0];
    const freshMessages = [welcomeMsg];
    setMessages(freshMessages);
    memoryChatCacheMap[userKey] = freshMessages;

    const newConv: ConversationItem = {
      id: newId,
      title: `Advisory — ${activeRegion.name}`,
      created_at: new Date().toISOString(),
      message_count: 1,
      last_message: welcomeMsg.content.slice(0, 60),
    };

    setConversations((prev) => [newConv, ...prev]);
    try {
      localStorage.setItem(getConvMessagesKey(userKey, newId), JSON.stringify(freshMessages));
      const savedList: ConversationItem[] = JSON.parse(
        localStorage.getItem(getConversationsKey(userKey)) || "[]"
      );
      localStorage.setItem(
        getConversationsKey(userKey),
        JSON.stringify([newConv, ...savedList.filter((c) => c.id !== newId)])
      );
    } catch (e) {}
  };

  const handleSelectConversation = async (convId: string) => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
      setIsLoading(false);
    }
    setActiveConversationId(convId);
    try {
      localStorage.setItem(getActiveConvKey(userKey), convId);
    } catch (e) {}

    // Check local storage / memory first
    try {
      const cached = localStorage.getItem(getConvMessagesKey(userKey, convId));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          memoryChatCacheMap[userKey] = parsed;
        }
      }
    } catch (e) {}

    // Fetch from backend in background to ensure remote synchronization
    try {
      const token = getBearerToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE_URL}/chat/conversations/${convId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const loaded: ChatMessage[] = data.messages.map((m: any) => ({
            id: String(m.id),
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            metrics: m.metadata?.metrics,
            dataSource: m.metadata?.data_source,
            safetyVerdict: m.metadata?.safety_verdict || "unknown",
            isLive: m.metadata?.is_live ?? true,
            activeNodes: m.metadata?.active_nodes,
            activitySuitability: m.metadata?.activity_suitability,
            riskResult: m.metadata?.risk_result,
            sourcesList: m.metadata?.sources,
            modelUsed: m.metadata?.model_used || "deterministic",
          }));
          setMessages(loaded);
          memoryChatCacheMap[userKey] = loaded;
          try {
            localStorage.setItem(getConvMessagesKey(userKey, convId), JSON.stringify(loaded));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Backend conversation fetch failed, using local cache:", err);
    }
  };

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, title: newTitle } : c))
    );
    try {
      const savedList: ConversationItem[] = JSON.parse(
        localStorage.getItem(getConversationsKey(userKey)) || "[]"
      );
      const updated = savedList.map((c) => (c.id === convId ? { ...c, title: newTitle } : c));
      localStorage.setItem(getConversationsKey(userKey), JSON.stringify(updated));
    } catch (e) {}

    try {
      const token = getBearerToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${API_BASE_URL}/chat/conversations/${convId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ title: newTitle }),
      });
    } catch (e) {}
  };

  const handleDeleteConversation = async (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    try {
      localStorage.removeItem(getConvMessagesKey(userKey, convId));
      const savedList: ConversationItem[] = JSON.parse(
        localStorage.getItem(getConversationsKey(userKey)) || "[]"
      );
      localStorage.setItem(
        getConversationsKey(userKey),
        JSON.stringify(savedList.filter((c) => c.id !== convId))
      );
    } catch (e) {}

    try {
      const token = getBearerToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      await fetch(`${API_BASE_URL}/chat/conversations/${convId}`, {
        method: "DELETE",
        headers,
      });
    } catch (e) {}

    if (convId === activeConversationId) {
      handleNewChat();
    }
  };

  // Persistent in-flight query handler: continues in background even across route transitions
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const currentConvId = activeConversationId;
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

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    memoryChatCacheMap[userKey] = updatedMessages;
    setInputText("");
    setIsLoading(true);
    inFlightRef.current[currentConvId] = true;

    // Persist user message to storage immediately
    try {
      localStorage.setItem(getConvMessagesKey(userKey, currentConvId), JSON.stringify(updatedMessages));
      localStorage.setItem(getChatHistoryKey(userKey), JSON.stringify(updatedMessages));
    } catch (e) {}

    let controller: AbortController | null = null;
    try {
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
      controller = new AbortController();
      activeAbortControllerRef.current = controller;

      const token = getBearerToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        headers["Authorization"] = "Bearer demo_client_guest_token";
      }

      let response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          query: textToSend.trim(),
          conversation_id: currentConvId,
          latitude: activeRegion.center[0],
          longitude: activeRegion.center[1],
          region_name: activeRegion.name,
          selected_model: selectedModel,
          language: LANGUAGES[currentLangIdx]?.code || "en",
        }),
      });

      // Resilient 401 recovery: if stale/invalid token was rejected, retry once with guest authorization
      if (response.status === 401 && headers["Authorization"] !== "Bearer demo_client_guest_token") {
        console.warn("FastAPI rejected session token (401). Retrying with guest session fallback...");
        headers["Authorization"] = "Bearer demo_client_guest_token";
        response = await fetch(`${API_BASE_URL}/chat`, {
          method: "POST",
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            query: textToSend.trim(),
            conversation_id: currentConvId,
            latitude: activeRegion.center[0],
            longitude: activeRegion.center[1],
            region_name: activeRegion.name,
            selected_model: selectedModel,
            language: LANGUAGES[currentLangIdx]?.code || "en",
          }),
        });
      }

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

      // Retrieve latest messages for this conversation (in case user sent another or navigated)
      let currentStored: ChatMessage[] = [];
      try {
        const stored = localStorage.getItem(getConvMessagesKey(userKey, currentConvId));
        if (stored) currentStored = JSON.parse(stored);
      } catch (e) {}

      const finalMessages = currentStored.length > 0 ? [...currentStored, assistantMsg] : [...updatedMessages, assistantMsg];

      // Commit to memory and persistent storage
      memoryChatCacheMap[userKey] = finalMessages;
      try {
        localStorage.setItem(getConvMessagesKey(userKey, currentConvId), JSON.stringify(finalMessages));
        localStorage.setItem(getChatHistoryKey(userKey), JSON.stringify(finalMessages));
      } catch (e) {}

      // Update state if user is currently viewing this conversation
      setMessages((prev) => {
        if (activeConversationId === currentConvId) {
          return finalMessages;
        }
        return prev;
      });

      // Update drawer conversation metadata
      setConversations((prev) => {
        let found = false;
        const updated = prev.map((c) => {
          if (c.id === currentConvId) {
            found = true;
            const newTitle =
              c.title.startsWith("New Marine Chat") || c.title.startsWith("Advisory —")
                ? textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "")
                : c.title;
            return {
              ...c,
              title: newTitle,
              message_count: finalMessages.length,
              last_message: assistantMsg.content.slice(0, 80),
            };
          }
          return c;
        });

        if (!found) {
          const newTitle = textToSend.slice(0, 36) + (textToSend.length > 36 ? "..." : "");
          updated.unshift({
            id: currentConvId,
            title: newTitle,
            created_at: new Date().toISOString(),
            message_count: finalMessages.length,
            last_message: assistantMsg.content.slice(0, 80),
          });
        }

        try {
          localStorage.setItem(getConversationsKey(userKey), JSON.stringify(updated));
        } catch (e) {}

        return updated;
      });
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        // Deliberate user action (conversation switch, new chat, or navigation).
        return;
      }
      console.warn("Error calling /chat endpoint:", err);
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

      let currentStored: ChatMessage[] = [];
      try {
        const stored = localStorage.getItem(getConvMessagesKey(userKey, currentConvId));
        if (stored) currentStored = JSON.parse(stored);
      } catch (e) {}
      const finalErrMessages = currentStored.length > 0 ? [...currentStored, errorMsg] : [...updatedMessages, errorMsg];

      memoryChatCacheMap[userKey] = finalErrMessages;
      try {
        localStorage.setItem(getConvMessagesKey(userKey, currentConvId), JSON.stringify(finalErrMessages));
      } catch (e) {}

      setMessages((prev) => {
        if (activeConversationId === currentConvId) {
          return finalErrMessages;
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      delete inFlightRef.current[currentConvId];
      if (activeAbortControllerRef.current === controller) {
        activeAbortControllerRef.current = null;
      }
    }
  };

  const clearChatHistory = () => {
    handleNewChat();
  };

  // Persist messages whenever updated by active userKey
  useEffect(() => {
    if (!loadedUserKeyRef.current || loadedUserKeyRef.current !== userKey) return;
    if (messages.length === 0) return;
    memoryChatCacheMap[userKey] = messages;
    try {
      localStorage.setItem(getChatHistoryKey(userKey), JSON.stringify(messages));
      localStorage.setItem(getConvMessagesKey(userKey, activeConversationId), JSON.stringify(messages));
    } catch (e) {}
  }, [messages, activeConversationId, userKey]);

  const value: ChatContextType = {
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
    userKey,
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
