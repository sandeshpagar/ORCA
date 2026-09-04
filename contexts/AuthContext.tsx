"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase, API_BASE_URL } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole =
  | "tourist"
  | "fisher"
  | "authority"
  | "researcher"
  | "disaster_management"
  | "general";

export interface HomeRegion {
  name: string;
  lat: number;
  lon: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  role: UserRole;
  token: string | null;
  homeRegion: HomeRegion;
  language: string;
  touristActivities: string[];
  hasSelectedRole: boolean;
  showRoleModal: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  selectInitialRole: (role: UserRole) => Promise<boolean>;
  saveTouristPreferences: (activities: string[], travelStyle?: string, lang?: string) => Promise<boolean>;
  setHomeRegion: (region: HomeRegion) => void;
  setLanguage: (lang: string) => void;
  setShowRoleModal: (show: boolean) => void;
  getBearerToken: () => string | null;
}

const defaultHomeRegion: HomeRegion = {
  name: "Gopalpur Shoals (Sector 4)",
  lat: 19.31,
  lon: 84.91,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRoleState] = useState<UserRole>("general");
  const [token, setToken] = useState<string | null>(null);
  const [homeRegion, setHomeRegionState] = useState<HomeRegion>(defaultHomeRegion);
  const [language, setLanguageState] = useState<string>("English");
  const [touristActivities, setTouristActivities] = useState<string[]>([]);
  const [hasSelectedRole, setHasSelectedRole] = useState<boolean>(false);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // Helper to get active bearer token
  const getBearerToken = useCallback((): string | null => {
    return token;
  }, [token]);

  // Sync profile from FastAPI backend using JWT token
  const fetchProfileFromBackend = useCallback(async (authToken: string, fallbackUser?: UserProfile) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const data = await res.json();
        const serverRole = data.role as UserRole;
        setRoleState(serverRole);

        if (serverRole !== "general") {
          setHasSelectedRole(true);
          setShowRoleModal(false);
        } else {
          setHasSelectedRole(false);
          setShowRoleModal(true);
        }

        if (data.language) setLanguageState(data.language);
        if (data.home_region_lat && data.home_region_lon) {
          setHomeRegionState({
            name: data.home_region_name || "Assigned Sector",
            lat: data.home_region_lat,
            lon: data.home_region_lon,
          });
        }

        // If role is tourist, also fetch tourist preferences
        if (serverRole === "tourist") {
          fetchTouristPreferences(authToken);
        }
      } else if (res.status === 401) {
        console.warn("Backend rejected token during profile sync.");
      }
    } catch (err) {
      console.warn("FastAPI backend not reachable yet, operating in client mode:", err);
      // If offline/demo mode, preserve existing local state
      if (fallbackUser) {
        setUser(fallbackUser);
      }
    }
  }, []);

  const fetchTouristPreferences = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/profile/tourist-preferences`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activities)) {
          setTouristActivities(data.activities);
        }
      }
    } catch (e) {
      console.warn("Could not fetch tourist preferences", e);
    }
  };

  // Listen to Supabase auth events
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // 1. Check active Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && session.user) {
          const userObj: UserProfile = {
            id: session.user.id,
            name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Officer",
            email: session.user.email || "",
          };

          if (isMounted) {
            setUser(userObj);
            setIsLoggedIn(true);
            setToken(session.access_token);
            await fetchProfileFromBackend(session.access_token, userObj);
          }
        } else {
          // 2. Check saved local session fallback
          const savedAuth = localStorage.getItem("orca_auth");
          const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                             process.env.NEXT_PUBLIC_SUPABASE_URL.includes("demo-orca") || 
                             process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

          if (savedAuth) {
            const parsed = JSON.parse(savedAuth);
            if (parsed.isLoggedIn && parsed.user) {
              if (isMounted) {
                setUser(parsed.user);
                setIsLoggedIn(true);
                if (parsed.token) setToken(parsed.token);
                if (parsed.role) setRoleState(parsed.role);
                if (parsed.homeRegion) setHomeRegionState(parsed.homeRegion);
                if (parsed.language) setLanguageState(parsed.language);
                if (parsed.touristActivities) setTouristActivities(parsed.touristActivities);
                if (parsed.hasSelectedRole) {
                  setHasSelectedRole(true);
                  setShowRoleModal(false);
                }
              }
            }
          } else if (isDemoMode) {
            // Default demo session ONLY when running in unconfigured demo mode
            const defaultUser: UserProfile = {
              id: "demo-cadet-01",
              name: "Cadet Sharma",
              email: "cadet@isro.gov.in",
            };
            const defaultToken = "demo_token_demo-cadet-01";
            if (isMounted) {
              setUser(defaultUser);
              setIsLoggedIn(true);
              setToken(defaultToken);
              setRoleState("general");
              setShowRoleModal(true);
            }
          } else {
            // Real Supabase configured: unauthenticated state
            if (isMounted) {
              setUser(null);
              setIsLoggedIn(false);
              setToken(null);
            }
          }
        }
      } catch (err) {
        console.error("Error during auth initialization:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    // Subscribe to Supabase auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session: Session | null) => {
        if (!isMounted) return;

        if (session && session.user) {
          const userObj: UserProfile = {
            id: session.user.id,
            name: session.user.user_metadata?.display_name || session.user.email?.split("@")[0] || "Officer",
            email: session.user.email || "",
          };
          setUser(userObj);
          setIsLoggedIn(true);
          setToken(session.access_token);
          await fetchProfileFromBackend(session.access_token, userObj);
        } else {
          setIsLoggedIn(false);
          setUser(null);
          setToken(null);
          setHasSelectedRole(false);
          setShowRoleModal(false);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfileFromBackend]);

  // Save state to localStorage for offline resilience
  const saveState = (updated: Partial<{
    isLoggedIn: boolean;
    user: UserProfile | null;
    role: UserRole;
    token: string | null;
    homeRegion: HomeRegion;
    language: string;
    touristActivities: string[];
    hasSelectedRole: boolean;
  }>) => {
    try {
      const current = {
        isLoggedIn,
        user,
        role,
        token,
        homeRegion,
        language,
        touristActivities,
        hasSelectedRole,
        ...updated,
      };
      localStorage.setItem("orca_auth", JSON.stringify(current));
    } catch (e) {
      console.error("Failed to save auth state to localStorage", e);
    }
  };

  // Real Supabase Login with fallback demo handling
  const login = async (email: string, password = "Password123!"): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes("demo-orca") || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

        // If Supabase project is demo/offline, allow graceful fallback demo login
        if (isDemo && (error.message.includes("fetch") || error.message.includes("Invalid API key") || error.message.includes("demo"))) {
          const demoUser: UserProfile = {
            id: `demo-${Date.now()}`,
            name: email.split("@")[0] || "Officer",
            email,
          };
          setUser(demoUser);
          setIsLoggedIn(true);
          // Generate demo token for FastAPI calls
          const demoToken = `demo_token_${demoUser.id}`;
          setToken(demoToken);
          saveState({ isLoggedIn: true, user: demoUser, token: demoToken });
          if (!hasSelectedRole) setShowRoleModal(true);
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      if (data.session && data.user) {
        const userObj: UserProfile = {
          id: data.user.id,
          name: data.user.user_metadata?.display_name || data.user.email?.split("@")[0] || "Officer",
          email: data.user.email || "",
        };
        setUser(userObj);
        setIsLoggedIn(true);
        setToken(data.session.access_token);
        saveState({ isLoggedIn: true, user: userObj, token: data.session.access_token });
        await fetchProfileFromBackend(data.session.access_token, userObj);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign in" };
    } finally {
      setIsLoading(false);
    }
  };

  // Real Supabase Signup
  const signup = async (email: string, password = "Password123!", name = "Officer"): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
        },
      });

      if (error) {
        const isDemo = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes("demo-orca") || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

        // Fallback demo signup ONLY if offline/demo
        if (isDemo && (error.message.includes("fetch") || error.message.includes("Invalid API key") || error.message.includes("demo"))) {
          const demoUser: UserProfile = {
            id: `demo-${Date.now()}`,
            name,
            email,
          };
          setUser(demoUser);
          setIsLoggedIn(true);
          const demoToken = `demo_token_${demoUser.id}`;
          setToken(demoToken);
          setHasSelectedRole(false);
          setShowRoleModal(true);
          saveState({ isLoggedIn: true, user: demoUser, token: demoToken, hasSelectedRole: false });
          return { success: true };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userObj: UserProfile = {
          id: data.user.id,
          name,
          email: data.user.email || "",
        };
        setUser(userObj);
        setIsLoggedIn(true);
        if (data.session) setToken(data.session.access_token);
        setHasSelectedRole(false);
        setShowRoleModal(true);
        saveState({
          isLoggedIn: true,
          user: userObj,
          token: data.session?.access_token || null,
          hasSelectedRole: false,
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign up" };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/monitor` },
      });
    } catch (e) {
      console.error("Google OAuth error:", e);
      // Fallback demo login
      await login("cadet.google@isro.gov.in");
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Supabase sign out error:", e);
    } finally {
      setIsLoggedIn(false);
      setUser(null);
      setToken(null);
      setHasSelectedRole(false);
      setShowRoleModal(false);
      try {
        localStorage.removeItem("orca_auth");
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Write chosen role to backend profiles.role on first onboarding only
  const selectInitialRole = async (newRole: UserRole): Promise<boolean> => {
    if (hasSelectedRole) {
      console.warn("Operational role is permanently locked once assigned.");
      return false;
    }

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/profile/role`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        });
      }
    } catch (e) {
      console.warn("Could not synchronize role with FastAPI backend:", e);
    }

    setRoleState(newRole);
    setHasSelectedRole(true);
    setShowRoleModal(false);
    saveState({ role: newRole, hasSelectedRole: true });
    return true;
  };

  // Save Tourist Onboarding preferences (activities, language, location)
  const saveTouristPreferences = async (
    activities: string[],
    travelStyle = "leisure",
    lang = "English"
  ): Promise<boolean> => {
    setTouristActivities(activities);
    saveState({ touristActivities: activities });

    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/profile/tourist-preferences`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activities,
            travel_style: travelStyle,
            language: lang,
          }),
        });
      }
      return true;
    } catch (e) {
      console.warn("Failed to persist tourist preferences to backend:", e);
      return false;
    }
  };

  const setHomeRegion = (region: HomeRegion) => {
    setHomeRegionState(region);
    saveState({ homeRegion: region });

    // Sync to backend
    if (token) {
      fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          home_region_name: region.name,
          home_region_lat: region.lat,
          home_region_lon: region.lon,
        }),
      }).catch(console.warn);
    }
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    saveState({ language: lang });

    if (token) {
      fetch(`${API_BASE_URL}/api/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language: lang }),
      }).catch(console.warn);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        user,
        role,
        token,
        homeRegion,
        language,
        touristActivities,
        hasSelectedRole,
        showRoleModal,
        login,
        signup,
        loginWithGoogle,
        logout,
        selectInitialRole,
        saveTouristPreferences,
        setHomeRegion,
        setLanguage,
        setShowRoleModal,
        getBearerToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
