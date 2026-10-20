import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Integration } from "@/lib/types";

export type ProviderName = "google_calendar" | "gmail";

/**
 * Guarda o actualiza la conexión y su secreto.
 * Los tokens solo se escriben con el cliente admin (service role) en servidor.
 */
export async function upsertIntegration(params: {
  userId: string;
  provider: ProviderName;
  providerAccountId: string;
  scopes: string[];
  encryptedRefreshToken: string;
}): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return "admin_no_configurado";

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
  if (error || !data) return "guardado_fallido";

  const { error: secretError } = await admin.from("integration_secrets").upsert({
    integration_id: data.id,
    encrypted_refresh_token: params.encryptedRefreshToken,
    key_version: "v1",
    updated_at: new Date().toISOString(),
  });
  return secretError ? "secreto_fallido" : null;
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
 * Desconecta: revoca el token en el proveedor (best effort), borra credenciales,
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

  await admin.from("email_items_cache").delete().eq("integration_id", integrationId);
  await admin.from("calendar_sources").delete().eq("integration_id", integrationId);
  // events_cache puede tener calendar_source_id nulo: se borra por usuario.
  await admin.from("events_cache").delete().eq("user_id", userId);
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
