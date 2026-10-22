import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshStoredToken } from "@/lib/integrations/google/tokens";
import { GMAIL_READ_SCOPES } from "@/lib/integrations/google/provider";
import type { ProviderName } from "@/lib/integrations/repository";

/**
 * Resolución de credenciales de Google para el usuario actual.
 *
 * Dos caminos, ambos solo en servidor:
 *  1. La conexión de la app (`integrations`): refresh token cifrado, se renueva
 *     cuando caduca. Es el camino principal y el único con control de permisos.
 *  2. El `provider_token` de la sesión de Supabase (login con Google):
 *     acceso directo, caduca en ~1 hora y solo sirve si Google concedió los
 *     scopes de Gmail en ese inicio de sesión.
 *
 * El token nunca se devuelve al navegador.
 */

export type GoogleTokenSource = "integracion" | "sesion";

export type FailureReason =
  | "sin_conexion"
  | "credencial_invalida"
  | "sin_permiso_lectura"
  | "error";

export type TokenResolution =
  | { ok: true; token: string; source: GoogleTokenSource; scopes: string[] }
  | { ok: false; reason: FailureReason };

interface IntegrationRow {
  id: string;
  scopes: string[] | null;
  status: string | null;
}

/** Conexiones de un usuario para un proveedor, con la última conexión en uso. */
async function findIntegration(
  userId: string,
  provider: ProviderName,
): Promise<IntegrationRow | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("integrations")
    .select("id, scopes, status")
    .eq("user_id", userId)
    .eq("provider", provider)
    .neq("status", "revocado")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as IntegrationRow | null) ?? null;
}

/** Token de Google de la sesión de Supabase (login con Google). */
async function sessionProviderToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;
  const provider = session.user?.app_metadata?.provider;
  if (provider !== "google") return null;
  return session.provider_token ?? null;
}

/** Scope necesario para leer el contenido de un mensaje (no solo metadatos). */
const GMAIL_CONTENT_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export async function resolveGoogleToken(
  userId: string,
  provider: ProviderName,
): Promise<TokenResolution> {
  const integration = await findIntegration(userId, provider);

  let integrationToken: string | null = null;
  let scopes: string[] = [];
  let integrationError: FailureReason | null = null;

  if (integration) {
    const refresh = await refreshStoredToken(integration.id);
    if (refresh.ok) {
      integrationToken = refresh.accessToken;
      scopes = integration.scopes ?? [];
    } else if (refresh.reason === "credencial_invalida") {
      integrationError = "credencial_invalida";
    } else if (refresh.reason === "clave_ausente") {
      integrationError = "error";
    }
  }

  // Para leer el cuerpo hace falta `gmail.readonly`; una conexión antigua solo
  // con metadatos no llega, y su token no sirve para resumir.
  const canReadContent =
    provider !== "gmail" || scopes.includes(GMAIL_CONTENT_SCOPE);

  if (integrationToken && canReadContent) {
    return {
      ok: true,
      token: integrationToken,
      source: "integracion",
      scopes,
    };
  }

  // Respaldo: el token de proveedor que Supabase guarda en la sesión.
  const sessionToken = await sessionProviderToken();
  if (sessionToken) {
    return {
      ok: true,
      token: sessionToken,
      source: "sesion",
      scopes: GMAIL_READ_SCOPES,
    };
  }

  if (integrationToken) return { ok: false, reason: "sin_permiso_lectura" };
  if (integrationError) return { ok: false, reason: integrationError };
  return { ok: false, reason: "sin_conexion" };
}
