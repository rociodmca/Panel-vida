import { decryptStoredSecret } from "@/lib/integrations/crypto";
import { googleProvider } from "@/lib/integrations/google/provider";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Integration } from "@/lib/types";

export type ProviderName = "google_calendar" | "gmail";

/**
 * Guarda o actualiza la conexión y su secreto.
 * Los tokens solo se escriben con el cliente admin (service role) en servidor.
 */
export interface UpsertIntegrationResult {
  id: string | null;
  error: string | null;
}

export async function upsertIntegration(params: {
  userId: string;
  provider: ProviderName;
  providerAccountId: string;
  scopes: string[];
  encryptedRefreshToken: string;
}): Promise<UpsertIntegrationResult> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { id: null, error: "admin_no_configurado" };

  const { data, error } = await admin
    .from("integrations")
    .upsert(
      {
        user_id: params.userId,
        provider: params.provider,
        provider_account_id: params.providerAccountId,
        scopes: params.scopes,
        status: "conectado",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider,provider_account_id" },
    )
    .select("id")
    .single();
  if (error || !data) return { id: null, error: "guardado_fallido" };

  // Google solo devuelve refresh token la primera vez (o con prompt=consent).
  // Si no llega, conservamos el que ya había en lugar de sobrescribirlo.
  let encrypted = params.encryptedRefreshToken;
  if (!encrypted) {
    const existing = await getRefreshToken(data.id);
    encrypted = existing ?? "";
  }
  if (!encrypted) return { id: data.id, error: "sin_refresh_token" };

  const { error: secretError } = await admin.from("integration_secrets").upsert({
    integration_id: data.id,
    encrypted_refresh_token: encrypted,
    key_version: "v1",
    updated_at: new Date().toISOString(),
  });
  return secretError ? { id: data.id, error: "secreto_fallido" } : { id: data.id, error: null };
}

export async function listIntegrations(userId: string): Promise<Integration[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("integrations")
    .select("id, provider, status, scopes, last_synced_at")
    .eq("user_id", userId)
    .neq("status", "revocado");
  return (data as Integration[]) ?? [];
}

/**
 * Devuelve la conexión solo si pertenece al usuario indicado.
 * Obligatorio antes de usar credenciales con service role.
 */
export async function getIntegrationForUser(
  userId: string,
  integrationId: string,
): Promise<Integration | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("integrations")
    .select("id, provider, status, scopes, last_synced_at")
    .eq("id", integrationId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Integration) ?? null;
}

export async function getRefreshToken(integrationId: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("integration_secrets")
    .select("encrypted_refresh_token")
    .eq("integration_id", integrationId)
    .maybeSingle();
  return (data?.encrypted_refresh_token as string) ?? null;
}

/**
 * Desconecta: revoca el token en Google (best effort), borra credenciales,
 * la conexión y la caché importada asociada.
 */
export async function disconnectIntegration(
  userId: string,
  integrationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "admin_no_configurado" };

  const { data: integration } = await admin
    .from("integrations")
    .select("id")
    .eq("id", integrationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!integration) return { ok: false, error: "no_encontrada" };

  // Revocación en el proveedor: el refresh token deja de ser utilizable.
  const stored = await getRefreshToken(integrationId);
  if (stored) {
    try {
      const refreshToken = decryptStoredSecret(stored);
      if (refreshToken) await googleProvider.revoke(refreshToken);
    } catch {
      // Si no se puede descifrar, el borrado local sigue siendo válido.
    }
  }

  await admin.from("email_items_cache").delete().eq("integration_id", integrationId);
  // Los eventos de estos calendarios caen por cascada (FK on delete cascade).
  await admin.from("calendar_sources").delete().eq("integration_id", integrationId);
  // Quedan los eventos huérfanos (sin calendario asociado).
  await admin
    .from("events_cache")
    .delete()
    .eq("user_id", userId)
    .is("calendar_source_id", null);
  await admin.from("sync_runs").delete().eq("integration_id", integrationId);
  await admin.from("integration_secrets").delete().eq("integration_id", integrationId);
  await admin.from("integrations").delete().eq("id", integrationId);
  return { ok: true };
}

export async function markSyncResult(
  integrationId: string,
  userId: string,
  itemsSynced: number,
  errorCode?: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("sync_runs").insert({
    user_id: userId,
    integration_id: integrationId,
    finished_at: new Date().toISOString(),
    status: errorCode ? "error" : "completado",
    items_synced: itemsSynced,
    error_code: errorCode ?? null,
  });
  if (!errorCode) {
    await admin
      .from("integrations")
      .update({ last_synced_at: new Date().toISOString(), status: "conectado" })
      .eq("id", integrationId);
  } else {
    await admin.from("integrations").update({ status: "error" }).eq("id", integrationId);
  }
}
