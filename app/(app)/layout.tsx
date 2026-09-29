"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ChatProvider, useChat } from "@/contexts/ChatContext";
import { FeatureFlagProvider } from "@/contexts/FeatureFlagContext";
import RoleSelectionModal from "@/components/RoleSelectionModal";
import AdminFloatingBar from "@/components/admin/AdminFloatingBar";

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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FeatureFlagProvider>
      <ChatProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </ChatProvider>
    </FeatureFlagProvider>
  );
}

function AppLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isLoading, isAdmin } = useAuth();
  const { isLoading: isChatGenerating } = useChat();

  // Route protection scaffolding: redirect to /login if not authenticated
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [isLoading, isLoggedIn, router]);

  // Prevent browser-level pinch zoom (Ctrl + mousewheel / touchpad pinch) from scoping out UI
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

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

  const isMonitorPage = pathname.startsWith("/monitor");
  const isChatPage = pathname.startsWith("/chat");
  const isFullscreenApp = isMonitorPage || isChatPage;

  return (
    <div className="flex flex-col h-screen h-[100dvh] w-full overflow-hidden bg-surface select-none">
      {/* Role Selection Modal (triggered on first login / signup only) */}
      <RoleSelectionModal />

      {/* Institutional Global Header - Permanent flex-top bar that cannot detach or scroll off */}
      <header className="h-16 shrink-0 w-full z-50 pt-safe bg-surface/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
        <div className="h-full px-margin-mobile md:px-margin-desktop flex items-center justify-between max-w-7xl mx-auto w-full">
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
                  {item.href === "/chat" && isChatGenerating && (
                    <span className="relative flex h-2 w-2 ml-0.5" title="Generating advisory in background...">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                    </span>
                  )}
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

          {/* Right Controls: Profile Avatar Button & Admin Portal Link */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 text-xs font-mono font-bold hover:bg-amber-500/25 transition-all shadow-xs"
                title="Open Super Admin Hub"
              >
                <span className="material-symbols-outlined text-[15px] text-amber-700">admin_panel_settings</span>
                <span className="hidden sm:inline">Admin Hub</span>
              </Link>
            )}

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

      {/* Main Page Content - Automatically fills remaining height between Header and Nav */}
      <main
        className={`flex-1 min-h-0 relative w-full ${
          isFullscreenApp
            ? "overflow-hidden"
            : "overflow-y-auto pb-20 md:pb-6"
        }`}
      >
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation (Monitor, AI Chat, Alerts) */}
      <nav
        className="md:hidden h-16 shrink-0 w-full z-50 pb-safe bg-surface/95 backdrop-blur-xl shadow-[0_-2px_10px_rgba(0,0,0,0.04)] border-t border-surface-container"
        data-active-classes="text-primary font-semibold"
      >
        <div className="flex justify-around items-center h-full px-space-xs">
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
                  {item.href === "/chat" && isChatGenerating && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
                  )}
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

      {/* Floating Admin Command Bar (Only visible to authenticated Admin) */}
      <AdminFloatingBar />
    </div>
  );
}
