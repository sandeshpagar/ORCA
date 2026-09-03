"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to monitor
  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/monitor");
    }
  }, [isLoggedIn, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      login(email, email.split("@")[0]);
      router.push("/monitor");
    }, 600);
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      login("officer.google@isro.gov.in", "ISRO Officer");
      router.push("/monitor");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container p-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 relative mb-3">
            <Image
              src="/images/orca-logo.svg"
              alt="ORCA Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="font-headline-sm text-headline-sm text-primary font-bold">
            Sign In to ORCA
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            ISRO Marine AI & Coastal Safety Advisory Grid
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-body-sm flex items-center gap-2 border border-error/20">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label-sm text-label-sm font-semibold text-primary mb-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="commander@isro.gov.in"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary text-body-sm transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-label-sm text-label-sm font-semibold text-primary">
                Password
              </label>
              <a href="#" className="text-[12px] text-secondary hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary text-body-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-primary text-on-primary font-body-md text-body-md font-semibold hover:bg-primary-container active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-container" />
          </div>
          <span className="relative bg-surface-container-lowest px-3 text-label-sm font-label-sm text-on-surface-variant uppercase">
            Or
          </span>
        </div>

        {/* Continue with Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
          className="w-full h-11 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-primary font-body-md text-body-md font-semibold flex items-center justify-center gap-2.5 active:scale-[0.99] transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Link to Signup */}
        <p className="text-center text-body-sm text-on-surface-variant mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-secondary font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
