import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * Estado de los proveedores de acceso de Supabase.
 * Se consulta en servidor (endpoint público /auth/v1/settings) para no
 * ofrecer un botón de acceso que vaya a fallar.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 3000;

interface AuthSettings {
  external?: Record<string, boolean>;
}

let cache: { value: boolean; expiresAt: number } | null = null;

export async function isGoogleAuthEnabled(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  let enabled = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (response.ok) {
      const settings = (await response.json()) as AuthSettings;
      enabled = settings.external?.google === true;
    }
  } catch {
    // Si no se puede consultar, no se ofrece el botón (fallo seguro).
    enabled = false;
  }

  cache = { value: enabled, expiresAt: Date.now() + CACHE_TTL_MS };
  return enabled;
}
