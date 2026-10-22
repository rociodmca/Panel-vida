import { DEMO_EVENTS, DEMO_EMAILS } from "@/lib/demo/fixtures";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";
import type { CalendarEvent, EmailItem } from "@/lib/types";

export async function getUpcomingEvents(limit = 10): Promise<CalendarEvent[]> {
  if (isDemoMode()) {
    return [...DEMO_EVENTS]
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, limit);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("events_cache")
    .select("id, title, starts_at, ends_at, all_day, location, external_url, calendar_sources(name)")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(limit);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    starts_at: row.starts_at as string,
    ends_at: row.ends_at as string | null,
    all_day: row.all_day as boolean,
    location: row.location as string | null,
    external_url: row.external_url as string | null,
    calendar_name:
      (row.calendar_sources as { name?: string } | null)?.name ?? "Calendario",
  }));
}

const EMAIL_COLUMNS =
  "id, external_id, sender_name, sender_email, subject, received_at, is_unread, is_important, external_url";
const EMAIL_COLUMNS_WITH_RELEVANCE =
  "id, external_id, sender_name, sender_email, subject, snippet, received_at, is_unread, is_important, relevance_score, relevance_reason, external_url";

export async function getRecentEmails(limit = 5): Promise<EmailItem[]> {
  if (isDemoMode()) {
    return [...DEMO_EMAILS]
      .sort((a, b) => b.received_at.localeCompare(a.received_at))
      .slice(0, limit);
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("email_items_cache")
    .select(EMAIL_COLUMNS_WITH_RELEVANCE)
    .order("received_at", { ascending: false })
    .limit(limit);

  // La migración 0004 (snippet y relevancia) puede aún no estar aplicada.
  if (error) {
    const fallback = await supabase
      .from("email_items_cache")
      .select(EMAIL_COLUMNS)
      .order("received_at", { ascending: false })
      .limit(limit);
    if (fallback.error) return [];
    return (fallback.data as EmailItem[]) ?? [];
  }
  return (data as EmailItem[]) ?? [];
}
