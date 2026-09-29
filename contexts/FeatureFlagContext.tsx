"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export type FeatureStatus = "SANDBOX_ONLY" | "PROMOTED_TO_LIVE" | "DISABLED";

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  category: "AI_MODELS" | "MAP_TELEMETRY" | "ALERTS_SAFETY" | "UX_TOOLS";
  status: FeatureStatus;
  addedAt: string;
  promotedAt?: string;
}

interface FeatureFlagContextType {
  flags: FeatureFlag[];
  isFeatureEnabled: (key: string) => boolean;
  setFeatureStatus: (key: string, status: FeatureStatus) => void;
  registerNewFeature: (newFlag: {
    key: string;
    name: string;
    description: string;
    category: "AI_MODELS" | "MAP_TELEMETRY" | "ALERTS_SAFETY" | "UX_TOOLS";
    status?: FeatureStatus;
  }) => boolean;
  deleteFeature: (key: string) => void;
  resetFlagsToDefault: () => void;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: "voice_audio_input",
    name: "Multilingual Voice Input (Speech-to-Text)",
    description: "Regional speech input (Hindi, Marathi, Gujarati, etc.) directly in the prompt dock.",
    category: "UX_TOOLS",
    status: "PROMOTED_TO_LIVE",
    addedAt: "2026-09-27T00:20:00Z",
    promotedAt: "2026-09-27T00:35:00Z",
  },
  {
    key: "openrouter_nemotron_lightning",
    name: "NVIDIA Nemotron 3.5 Lightning Engine",
    description: "Ultra-fast low-latency cloud model for coastal suitability reasoning.",
    category: "AI_MODELS",
    status: "PROMOTED_TO_LIVE",
    addedAt: "2026-09-26T22:00:00Z",
    promotedAt: "2026-09-26T22:30:00Z",
  },
  {
    key: "high_freq_sar_simulator",
    name: "High-Frequency SAR Drift Simulator",
    description: "Sub-kilometer Monte Carlo search-and-rescue drift modeling for stranded vessels.",
    category: "ALERTS_SAFETY",
    status: "SANDBOX_ONLY",
    addedAt: "2026-09-27T22:00:00Z",
  },
  {
    key: "bathy_contours_3d",
    name: "3D Bathymetry Depth Contours",
    description: "WebGL-powered 3D continental shelf gradient and submarine trench visualization.",
    category: "MAP_TELEMETRY",
    status: "SANDBOX_ONLY",
    addedAt: "2026-09-27T22:00:00Z",
  },
  {
    key: "extreme_cyclone_surge_matrix",
    name: "Extreme Cyclone Surge Matrix (NDRF Protocol)",
    description: "Automated coastal storm surge prediction with multi-district evacuation routing.",
    category: "ALERTS_SAFETY",
    status: "SANDBOX_ONLY",
    addedAt: "2026-09-27T22:00:00Z",
  },
];

const STORAGE_KEY = "orca_feature_flags";

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export function FeatureFlagProvider({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const [flags, setFlags] = useState<FeatureFlag[]>(DEFAULT_FEATURE_FLAGS);

  // Initialize from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge saved with defaults in case new code defaults were introduced
          const existingKeys = new Set(parsed.map((f: FeatureFlag) => f.key));
          const merged = [
            ...parsed,
            ...DEFAULT_FEATURE_FLAGS.filter((f) => !existingKeys.has(f.key)),
          ];
          setFlags(merged);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load feature flags from localStorage", e);
    }
    setFlags(DEFAULT_FEATURE_FLAGS);
  }, []);

  // Save to localStorage helper
  const persistFlags = useCallback((newFlags: FeatureFlag[]) => {
    setFlags(newFlags);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFlags));
      window.dispatchEvent(new Event("orca_flags_updated"));
    } catch (e) {
      console.error("Failed to save feature flags to storage", e);
    }
  }, []);

  // Core Evaluation: decides whether a feature is active for the current viewing session
  const isFeatureEnabled = useCallback(
    (key: string): boolean => {
      const flag = flags.find((f) => f.key === key);
      if (!flag) return false;

      if (flag.status === "PROMOTED_TO_LIVE") {
        return true;
      }
      if (flag.status === "SANDBOX_ONLY") {
        // Only accessible when logged in as admin
        return Boolean(isAdmin);
      }
      return false; // DISABLED
    },
    [flags, isAdmin]
  );

  const setFeatureStatus = useCallback(
    (key: string, status: FeatureStatus) => {
      const updated = flags.map((f) => {
        if (f.key === key) {
          return {
            ...f,
            status,
            promotedAt: status === "PROMOTED_TO_LIVE" ? new Date().toISOString() : f.promotedAt,
          };
        }
        return f;
      });
      persistFlags(updated);
    },
    [flags, persistFlags]
  );

  const registerNewFeature = useCallback(
    (newFlag: {
      key: string;
      name: string;
      description: string;
      category: "AI_MODELS" | "MAP_TELEMETRY" | "ALERTS_SAFETY" | "UX_TOOLS";
      status?: FeatureStatus;
    }): boolean => {
      const cleanedKey = newFlag.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
      if (!cleanedKey || flags.some((f) => f.key === cleanedKey)) {
        return false;
      }

      const created: FeatureFlag = {
        key: cleanedKey,
        name: newFlag.name.trim(),
        description: newFlag.description.trim(),
        category: newFlag.category,
        status: newFlag.status || "SANDBOX_ONLY",
        addedAt: new Date().toISOString(),
      };

      const updated = [created, ...flags];
      persistFlags(updated);
      return true;
    },
    [flags, persistFlags]
  );

  const deleteFeature = useCallback(
    (key: string) => {
      const updated = flags.filter((f) => f.key !== key);
      persistFlags(updated);
    },
    [flags, persistFlags]
  );

  const resetFlagsToDefault = useCallback(() => {
    persistFlags(DEFAULT_FEATURE_FLAGS);
  }, [persistFlags]);

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        isFeatureEnabled,
        setFeatureStatus,
        registerNewFeature,
        deleteFeature,
        resetFlagsToDefault,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider");
  }
  return context;
}
