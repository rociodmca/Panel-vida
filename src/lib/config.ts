const env = process.env;

export const APP_URL =
  env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const CRON_SECRET = env.CRON_SECRET ?? "";

export const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET ?? "";

// Cifrado AES-256-GCM de tokens OAuth en reposo (solo servidor).
// Base64 de exactamente 32 bytes. Genera una con: openssl rand -base64 32
export const TOKEN_ENCRYPTION_KEY = env.TOKEN_ENCRYPTION_KEY ?? "";

export const EMAIL_PROVIDER = env.EMAIL_PROVIDER ?? "log";
export const EMAIL_API_KEY = env.EMAIL_API_KEY ?? "";
export const EMAIL_FROM = env.EMAIL_FROM ?? "";

export const DEFAULT_TIMEZONE = "Europe/Madrid";
export const DEFAULT_LOCALE = "es-ES";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}
