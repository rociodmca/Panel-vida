"use server";

import { revalidatePath } from "next/cache";
import { isGoogleConfigured } from "@/lib/config";
import { refreshStoredToken } from "@/lib/integrations/google/tokens";
import { listCalendars, listUpcomingEvents } from "@/lib/integrations/google/calendar";
import { listRecentMessageMetadata } from "@/lib/integrations/google/gmail";
import {
  disconnectIntegration,
  markSyncResult,
} from "@/lib/integrations/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IntegrationActionState {
  error?: string;
  success?: string;
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function disconnectAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Inicia sesión para gestionar conexiones." };
  const integrationId = String(formData.get("integration_id") ?? "");
  if (!integrationId) return { error: "Conexión no indicada." };

  const result = await disconnectIntegration(userId, integrationId);
  if (!result.ok) return { error: "No se pudo desconectar. Inténtalo de nuevo." };
  revalidatePath("/ajustes");
  return { success: "Conexión eliminada y datos importados borrados." };
}

export async function syncNowAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Inicia sesión para sincronizar." };
  if (!isGoogleConfigured()) return { error: "Google OAuth no está configurado." };

  const integrationId = String(formData.get("integration_id") ?? "");
  const provider = String(formData.get("provider") ?? "");
  if (!integrationId) return { error: "Conexión no indicada." };

  const accessToken = await refreshStoredToken(integrationId);
  if (!accessToken) return { error: "No se pudo renovar la credencial. Conéctate de nuevo." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "Servidor no configurado." };

  try {
    if (provider === "gmail") {
      const metas = await listRecentMessageMetadata(accessToken, 10);
      for (const meta of metas) {
        await admin.from("email_items_cache").upsert(
          {
            user_id: userId,
            integration_id: integrationId,
            external_id: meta.externalId,
            sender_name: meta.senderName,
            sender_email: meta.senderEmail,
            subject: meta.subject,
            received_at: meta.receivedAt,
            is_unread: meta.isUnread,
            is_important: meta.isImportant,
            external_url: meta.externalUrl,
          },
          { onConflict: "integration_id,external_id" },
        );
      }
      await markSyncResult(integrationId, userId, metas.length);
      revalidatePath("/hoy");
      revalidatePath("/ajustes");
      return { success: `Sincronizados ${metas.length} mensajes (metadatos).` };
    }

    const calendars = (await listCalendars(accessToken)).filter((c) => c.selected !== false);
    let total = 0;
    for (const cal of calendars) {
      const { data: source } = await admin
        .from("calendar_sources")
        .upsert(
          {
            user_id: userId,
            integration_id: integrationId,
            external_id: cal.id,
            name: cal.summary,
            enabled: true,
          },
          { onConflict: "integration_id,external_id" },
        )
        .select("id")
        .single();
      const events = await listUpcomingEvents(accessToken, cal.id, 25);
      for (const event of events) {
        await admin.from("events_cache").upsert(
          {
            user_id: userId,
            calendar_source_id: source?.id ?? null,
            external_id: `${cal.id}:${event.externalId}`,
            title: event.title,
            starts_at: event.startsAt,
            ends_at: event.endsAt,
            all_day: event.allDay,
            location: event.location,
            external_url: event.externalUrl,
          },
          { onConflict: "user_id,external_id" },
        );
        total += 1;
      }
    }
    await markSyncResult(integrationId, userId, total);
    revalidatePath("/hoy");
    revalidatePath("/agenda");
    revalidatePath("/ajustes");
    return { success: `Sincronizados ${total} eventos.` };
  } catch {
    await markSyncResult(integrationId, userId, 0, "sync_error");
    return { error: "La sincronización falló. Se ha registrado el error." };
  }
}
