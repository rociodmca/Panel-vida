import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";
import type { Note } from "@/lib/types";

const DEMO_NOTES: Note[] = [];

/** Notas recientes primero (fijadas antes si las hay). */
export async function getRecentNotes(limit = 20): Promise<Note[]> {
  if (isDemoMode()) return DEMO_NOTES;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return DEMO_NOTES;

  const { data } = await supabase
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data as Note[]) ?? [];
}
