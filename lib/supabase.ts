import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://demo-orca.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.demo_signature_key";

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const sanitizeUrl = (url?: string): string => {
  if (!url) return "http://localhost:8000";
  let clean = url.trim();
  if (clean.includes("=")) {
    clean = clean.split("=").pop()?.trim() || "http://localhost:8000";
  }
  return clean.replace(/\/+$/, "");
};

export const API_BASE_URL = sanitizeUrl(process.env.NEXT_PUBLIC_API_URL);
