"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";
import { ROLE_DETAILS } from "@/lib/recommendations";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAdmin, isLoading, role, setRoleAsAdmin, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/login");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 rounded-full border-3 border-secondary border-t-transparent animate-spin" />
        <span className="font-mono text-sm text-primary font-bold">
          Verifying Admin Credentials...
        </span>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const currentRoleInfo = ROLE_DETAILS[role] || { label: role, icon: "badge" };

  return (
    <FeatureFlagProvider>
      <div className="min-h-screen bg-surface-container-lowest text-on-surface flex flex-col font-sans">
        {/* Admin Hub Top Bar */}
        <header className="border-b border-surface-container bg-surface/95 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 border border-amber-500/30 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight">
                    ORCA Control Hub
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 text-[10px] font-mono font-bold uppercase tracking-wider">
                    SUPER ADMIN
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant font-mono">
                  admin@gmail.com · Feature Staging &amp; Multi-Role Sandbox
                </p>
              </div>
            </div>

            {/* Quick Actions & Perspective Pill */}
            <div className="flex items-center gap-2.5">
              {/* Active Persona Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-surface-container text-xs font-mono">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  {currentRoleInfo.icon}
                </span>
                <span className="text-on-surface-variant">Active:</span>
                <strong className="text-primary uppercase">{currentRoleInfo.label}</strong>
              </div>

              {/* Live App Link */}
              <Link
                href="/monitor"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-mono font-semibold transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                <span>Open Live Site</span>
              </Link>

              {/* Logout */}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
                title="Sign out of Admin Session"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
          {children}
        </main>
      </div>
    </FeatureFlagProvider>
  );
}
