import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";

export interface SearchResult {
  kind: "tarea" | "nota" | "evento" | "correo";
  id: string;
  title: string;
  detail: string | null;
  /** URL externa (Gmail) si procede; para el resto, ruta interna. */
  href: string | null;
  /** Fecha ISO para ordenar; null si no tiene. */
  date: string | null;
}

/**
 * Escapa los caracteres especiales del patrón LIKE (ilike) de PostgREST
 * y los que romperían un filtro `or=(...)`, para que el término de búsqueda
 * se interprete literalmente.
 */
export function sanitizeLikeTerm(term: string): string {
  return term
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_")
    .replaceAll(",", " ")
    .replaceAll("(", " ")
    .replaceAll(")", " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Busca en tareas, notas, eventos y correos en caché (RLS del usuario). */
export async function searchAll(rawTerm: string): Promise<SearchResult[]> {
  const term = rawTerm.trim();
  if (term.length < 2) return [];
  if (isDemoMode()) return [];

  const pattern = `%${sanitizeLikeTerm(term)}%`;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const [tasksRes, notesRes, eventsRes, emailsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, notes, due_at")
      .neq("status", "archivada")
      .or(`title.ilike.${pattern},notes.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("notes")
      .select("id, title, body, updated_at")
      .or(`title.ilike.${pattern},body.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("events_cache")
      .select("id, title, starts_at, location")
      .ilike("title", pattern)
      .limit(5),
    supabase
      .from("email_items_cache")
      .select("id, subject, sender_name, sender_email, received_at, external_url")
      .or(`subject.ilike.${pattern},sender_name.ilike.${pattern}`)
      .limit(5),
  ]);

  const results: SearchResult[] = [
    ...(tasksRes.data ?? []).map((task) => ({
      kind: "tarea" as const,
      id: task.id as string,
      title: task.title as string,
      detail: (task.notes as string | null) ?? null,
      href: "/tareas",
      date: (task.due_at as string | null) ?? null,
    })),
    ...(notesRes.data ?? []).map((note) => ({
      kind: "nota" as const,
      id: note.id as string,
      title: note.title as string,
      detail: note.body as string,
      href: "/tareas",
      date: (note.updated_at as string | null) ?? null,
    })),
    ...(eventsRes.data ?? []).map((event) => ({
      kind: "evento" as const,
      id: event.id as string,
      title: event.title as string,
      detail: (event.location as string | null) ?? null,
      href: "/agenda",
      date: event.starts_at as string,
    })),
    ...(emailsRes.data ?? []).map((mail) => ({
      kind: "correo" as const,
      id: mail.id as string,
      title: mail.subject as string,
      detail: (mail.sender_name as string | null) ?? mail.sender_email,
      href: (mail.external_url as string | null) ?? null,
      date: mail.received_at as string,
    })),
  ];

  return results.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
