"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole =
  | "fisherman"
  | "researcher"
  | "authority"
  | "tourist"
  | "operator";

export interface HomeRegion {
  name: string;
  lat: number;
  lon: number;
}

export interface UserProfile {
  name: string;
  email: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  role: UserRole;
  homeRegion: HomeRegion;
  language: string;
  hasSelectedRole: boolean;
  showRoleModal: boolean;
  login: (email?: string, name?: string) => void;
  signup: (email?: string, name?: string) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
  setHomeRegion: (region: HomeRegion) => void;
  setLanguage: (lang: string) => void;
  setShowRoleModal: (show: boolean) => void;
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
  const [role, setRoleState] = useState<UserRole>("fisherman");
  const [homeRegion, setHomeRegionState] = useState<HomeRegion>(defaultHomeRegion);
  const [language, setLanguageState] = useState<string>("English");
  const [hasSelectedRole, setHasSelectedRole] = useState<boolean>(false);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem("orca_auth");
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        setIsLoggedIn(Boolean(parsed.isLoggedIn));
        setUser(parsed.user || null);
        if (parsed.role) setRoleState(parsed.role);
        if (parsed.homeRegion) setHomeRegionState(parsed.homeRegion);
        if (parsed.language) setLanguageState(parsed.language);
        if (parsed.hasSelectedRole !== undefined) {
          setHasSelectedRole(parsed.hasSelectedRole);
        }
      }
    } catch (e) {
      console.error("Failed to load auth state from localStorage", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage on state changes
  const saveState = (updated: Partial<{
    isLoggedIn: boolean;
    user: UserProfile | null;
    role: UserRole;
    homeRegion: HomeRegion;
    language: string;
    hasSelectedRole: boolean;
  }>) => {
    try {
      const current = {
        isLoggedIn,
        user,
        role,
        homeRegion,
        language,
        hasSelectedRole,
        ...updated,
      };
      localStorage.setItem("orca_auth", JSON.stringify(current));
    } catch (e) {
      console.error("Failed to save auth state to localStorage", e);
    }
  };

  const login = (email = "commander@isro.gov.in", name = "Officer Sandeep") => {
    const newUser = { email, name };
    setIsLoggedIn(true);
    setUser(newUser);
    saveState({ isLoggedIn: true, user: newUser });
    if (!hasSelectedRole) {
      setShowRoleModal(true);
    }
  };

  const signup = (email = "cadet@isro.gov.in", name = "New Officer") => {
    const newUser = { email, name };
    setIsLoggedIn(true);
    setUser(newUser);
    setHasSelectedRole(false);
    setShowRoleModal(true);
    saveState({ isLoggedIn: true, user: newUser, hasSelectedRole: false });
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setShowRoleModal(false);
    try {
      localStorage.removeItem("orca_auth");
    } catch (e) {
      console.error(e);
    }
  };

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setHasSelectedRole(true);
    setShowRoleModal(false);
    saveState({ role: newRole, hasSelectedRole: true });
  };

  const setHomeRegion = (region: HomeRegion) => {
    setHomeRegionState(region);
    saveState({ homeRegion: region });
  };

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    saveState({ language: lang });
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        user,
        role,
        homeRegion,
        language,
        hasSelectedRole,
        showRoleModal,
        login,
        signup,
        logout,
        setRole,
        setHomeRegion,
        setLanguage,
        setShowRoleModal,
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
