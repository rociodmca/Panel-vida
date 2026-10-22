import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * Estado de la clave de servicio (service role) de Supabase.
 * Sin ella el servidor no puede escribir la caché de Google ni los secretos
 * cifrados, así que conviene avisar en la interfaz en vez de fallar después.
 */

export type AdminStatus =
  | "ok"
  | "sin_configurar"
  | "invalido"
  | "sin_esquema"
  | "error_servidor";

const CACHE_TTL_MS = 60 * 1000;
const TIMEOUT_MS = 4000;

let cache: { value: AdminStatus; expiresAt: number } | null = null;

export async function getAdminStatus(): Promise<AdminStatus> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return "sin_configurar";
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  let status: AdminStatus = "error_servidor";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/integrations?select=id&limit=1`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: controller.signal,
        cache: "no-store",
      },
    );
    clearTimeout(timer);
    if (response.ok) status = "ok";
    else if (response.status === 401 || response.status === 403) status = "invalido";
    else if (response.status === 404) status = "sin_esquema";
  } catch {
    status = "error_servidor";
  }

  cache = { value: status, expiresAt: Date.now() + CACHE_TTL_MS };
  return status;
}
