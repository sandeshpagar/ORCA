"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import RoleSelectionModal from "@/components/RoleSelectionModal";

interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { name: "Monitor", href: "/monitor", icon: "radar" },
  { name: "AI Chat", href: "/chat", icon: "smart_toy" },
  { name: "Alerts", href: "/alerts", icon: "fmd_bad", badge: "VARUN" },
];

const rolesConfig: { id: UserRole; name: string; icon: string }[] = [
  { id: "fisherman", name: "Fisherman", icon: "sailing" },
  { id: "researcher", name: "Researcher", icon: "query_stats" },
  { id: "authority", name: "Coastal Authority", icon: "shield" },
  { id: "tourist", name: "Tourist", icon: "beach_access" },
  { id: "operator", name: "Maritime Operator", icon: "directions_boat" },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isLoading, role, setRole } = useAuth();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        roleMenuRef.current &&
        !roleMenuRef.current.contains(event.target as Node)
      ) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Route protection scaffolding: redirect to /login if not authenticated
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  // Loading spinner during auth hydration
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 relative mb-4">
          <Image
            src="/images/orca-logo.svg"
            alt="ORCA Logo"
            fill
            className="object-contain animate-pulse"
          />
        </div>
        <div className="flex items-center gap-2 text-primary font-mono text-body-sm font-semibold">
          <span className="w-3 h-3 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
          <span>Syncing ISRO NavIC Session...</span>
        </div>
      </div>
    );
  }

  // If not logged in and not loading, render nothing while redirect takes place
  if (!isLoggedIn) {
    return null;
  }

  const currentRoleConfig =
    rolesConfig.find((r) => r.id === role) || rolesConfig[0];

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Role Selection Modal (triggered on first login / via profile) */}
      <RoleSelectionModal />

      {/* Institutional Global Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
        <div className="h-16 px-margin-mobile md:px-margin-desktop flex items-center justify-between max-w-7xl mx-auto w-full">
          {/* Left: Branding & Satellite status */}
          <Link href="/monitor" className="flex items-center gap-space-sm min-w-0 group">
            <div className="h-9 w-9 relative shrink-0 rounded-xl overflow-hidden shadow-sm">
              <Image
                src="/images/orca-logo.svg"
                alt="ORCA ISRO Marine AI Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm text-primary truncate leading-tight group-hover:text-secondary transition-colors">
                  ORCA · ISRO Marine AI
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-mono">
                  ISRO NavIC Active Advisory
                </span>
              </div>
            </div>
          </Link>

          {/* Center: Desktop Navigation Bar (Only Monitor, AI Chat, Alerts) */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low p-1 rounded-full border border-surface-container">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary text-on-primary shadow-sm"
                      : "text-on-surface-variant hover:text-primary hover:bg-surface-container"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        isActive
                          ? "bg-error text-on-error"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Role Switcher Dropdown, Dev-only Guide Icon, Profile Icon */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Role Switcher Dropdown */}
            <div className="relative" ref={roleMenuRef}>
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-primary transition-all text-label-sm font-semibold"
                title="Switch Active Persona"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  {currentRoleConfig.icon}
                </span>
                <span className="hidden sm:inline font-mono uppercase text-[11px]">
                  {currentRoleConfig.name}
                </span>
                <span className="material-symbols-outlined text-[14px]">
                  {roleMenuOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-mono uppercase font-bold text-on-surface-variant border-b border-surface-container">
                    Switch Operational Role
                  </div>
                  {rolesConfig.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setRole(r.id);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-body-sm transition-colors ${
                        role === r.id
                          ? "bg-secondary-container/40 text-primary font-bold"
                          : "text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          {r.icon}
                        </span>
                        <span>{r.name}</span>
                      </div>
                      {role === r.id && (
                        <span className="material-symbols-outlined text-secondary text-[16px]">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-surface-container mt-1 pt-1">
                    <Link
                      href="/profile"
                      onClick={() => setRoleMenuOpen(false)}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-[12px] text-on-surface-variant hover:text-primary hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      <span>Manage in Profile</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Guide Icon Button: Hidden in Production */}
            {process.env.NODE_ENV !== "production" && (
              <Link
                href="/guide"
                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-primary hover:text-secondary transition-colors"
                title="Guide (Design System & Tokens)"
              >
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
              </Link>
            )}

            {/* Profile Avatar Button */}
            <Link
              href="/profile"
              className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm text-on-primary transition-all ${
                pathname === "/profile"
                  ? "bg-secondary ring-2 ring-secondary/40"
                  : "bg-primary hover:bg-primary-container"
              }`}
              title="Profile & Settings"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-16 md:pb-6">
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation (Monitor, AI Chat, Alerts) */}
      <nav
        className="md:hidden fixed bottom-0 w-full z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_10px_rgba(0,0,0,0.04)] border-t border-surface-container"
        data-active-classes="text-primary font-semibold"
      >
        <div className="flex justify-around items-center h-16 px-space-xs">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center min-w-[72px] h-12 transition-colors duration-150 relative ${
                  isActive
                    ? "text-primary font-semibold"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <div className="relative">
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-error animate-ping" />
                  )}
                </div>
                <span className="font-label-sm text-label-sm mt-0.5">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
