import { listCalendars, listUpcomingEvents } from "@/lib/integrations/google/calendar";
import { listRecentMessageMetadata } from "@/lib/integrations/google/gmail";
import { markSyncResult } from "@/lib/integrations/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { EmailMetaDraft } from "@/lib/integrations/types";

/**
 * Sincronización de datos de Google hacia la caché local.
 * Se usa desde el callback OAuth y desde la acción manual "Sincronizar",
 * para que ambos caminos escriban exactamente lo mismo.
 */

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

/** La migración 0004 añade columnas nuevas; si aún no está aplicada, se omite. */
function isMissingColumnError(error: PostgrestLikeError | null): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /column .* does not exist|schema cache/i.test(error.message ?? "");
}

function emailRow(userId: string, integrationId: string, meta: EmailMetaDraft) {
  return {
    user_id: userId,
    integration_id: integrationId,
    external_id: meta.externalId,
    sender_name: meta.senderName,
    sender_email: meta.senderEmail,
    subject: meta.subject,
    snippet: meta.snippet,
    received_at: meta.receivedAt,
    is_unread: meta.isUnread,
    is_important: meta.isImportant,
    relevance_score: meta.relevanceScore,
    relevance_reason: meta.relevanceReason,
    external_url: meta.externalUrl,
  };
}

export interface SyncOutcome {
  ok: boolean;
  items: number;
  errorCode?: string;
}

/** Sincroniza metadatos de Gmail (sin cuerpos ni adjuntos). */
export async function syncGmail(
  userId: string,
  integrationId: string,
  accessToken: string,
  maxResults = 20,
): Promise<SyncOutcome> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, items: 0, errorCode: "admin_no_configurado" };

  try {
    const metas = await listRecentMessageMetadata(accessToken, maxResults);
    if (metas.length > 0) {
      const rows = metas.map((meta) => emailRow(userId, integrationId, meta));
      const { error } = await admin
        .from("email_items_cache")
        .upsert(rows, { onConflict: "integration_id,external_id" });
      if (error && isMissingColumnError(error)) {
        // La migración 0004 todavía no está aplicada: guardamos lo esencial.
        const fallback = rows.map((row) => {
          const { snippet, relevance_score, relevance_reason, ...rest } = row;
          void snippet;
          void relevance_score;
          void relevance_reason;
          return rest;
        });
        const { error: fallbackError } = await admin
          .from("email_items_cache")
          .upsert(fallback, { onConflict: "integration_id,external_id" });
        if (fallbackError) {
          await markSyncResult(integrationId, userId, 0, "sync_gmail");
          return { ok: false, items: 0, errorCode: "sync_gmail" };
        }
      } else if (error) {
        await markSyncResult(integrationId, userId, 0, "sync_gmail");
        return { ok: false, items: 0, errorCode: "sync_gmail" };
      }
    }
    await markSyncResult(integrationId, userId, metas.length);
    return { ok: true, items: metas.length };
  } catch {
    await markSyncResult(integrationId, userId, 0, "sync_gmail");
    return { ok: false, items: 0, errorCode: "sync_gmail" };
  }
}

/** Sincroniza calendarios y eventos próximos. */
export async function syncCalendar(
  userId: string,
  integrationId: string,
  accessToken: string,
  maxResults = 25,
): Promise<SyncOutcome> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, items: 0, errorCode: "admin_no_configurado" };

  try {
    const calendars = (await listCalendars(accessToken)).filter(
      (calendar) => calendar.selected !== false,
    );
    let total = 0;
    for (const calendar of calendars) {
      const { data: source } = await admin
        .from("calendar_sources")
        .upsert(
          {
            user_id: userId,
            integration_id: integrationId,
            external_id: calendar.id,
            name: calendar.summary,
            enabled: true,
          },
          { onConflict: "integration_id,external_id" },
        )
        .select("id")
        .single();

      const events = await listUpcomingEvents(accessToken, calendar.id, maxResults);
      if (events.length > 0) {
        const { error } = await admin
          .from("events_cache")
          .upsert(
            events.map((event) => ({
              user_id: userId,
              calendar_source_id: source?.id ?? null,
              external_id: `${calendar.id}:${event.externalId}`,
              title: event.title,
              starts_at: event.startsAt,
              ends_at: event.endsAt,
              all_day: event.allDay,
              location: event.location,
              external_url: event.externalUrl,
            })),
            { onConflict: "user_id,external_id" },
          );
        if (error) {
          await markSyncResult(integrationId, userId, 0, "sync_calendar");
          return { ok: false, items: 0, errorCode: "sync_calendar" };
        }
      }
      total += events.length;
    }
    await markSyncResult(integrationId, userId, total);
    return { ok: true, items: total };
  } catch {
    await markSyncResult(integrationId, userId, 0, "sync_calendar");
    return { ok: false, items: 0, errorCode: "sync_calendar" };
  }
}
