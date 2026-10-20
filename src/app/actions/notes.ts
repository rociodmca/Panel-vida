"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface NoteActionState {
  error?: string;
  success?: string;
}

/** Captura rápida de una nota (brain dump). El título es la primera línea. */
export async function createNote(
  _prev: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Escribe algo antes de guardar." };
  if (body.length > 5000) return { error: "La nota es demasiado larga (máx. 5000 caracteres)." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const firstLine = body.split("\n", 1)[0].trim();
  const title = firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;

  try {
    const { error } = await supabase
      .from("notes")
      .insert({ user_id: data.user.id, title, body });
    if (error) return { error: "No se pudo guardar la nota." };
    revalidatePath("/", "layout");
    return { success: "Nota guardada." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Elimina una nota propia. */
export async function deleteNote(id: string): Promise<NoteActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return { error: "No se pudo eliminar la nota." };
    revalidatePath("/", "layout");
    return { success: "Nota eliminada." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Fija o suelta una nota (las fijadas aparecen primero). */
export async function togglePinNote(
  id: string,
  pinned: boolean,
): Promise<NoteActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const { error } = await supabase
      .from("notes")
      .update({ pinned, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: "No se pudo actualizar la nota." };
    revalidatePath("/", "layout");
    return { success: pinned ? "Nota fijada." : "Nota suelta." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}
