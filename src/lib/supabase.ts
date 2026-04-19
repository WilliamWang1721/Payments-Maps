import { createClient } from "@supabase/supabase-js";

function normalizeEnvValue(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL) || "https://placeholder.supabase.co";
const supabaseAnonKey = normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY) || "placeholder-key";
export const isSupabaseConfigured = Boolean(
  normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL) && normalizeEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY)
);

if (!isSupabaseConfigured) {
  console.warn("Supabase environment variables are missing. Fluxa backend features will stay read-only.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  },
  db: {
    schema: "public"
  },
  global: {
    headers: {
      "x-client-info": "fluxa-map-app"
    }
  }
});
