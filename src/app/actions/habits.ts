"use server";

import { revalidatePath } from "next/cache";
import { localDayKey } from "@/lib/datetime";
import { MAX_ACTIVE_HABITS } from "@/lib/data/habits";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface HabitActionState {
  error?: string;
  success?: string;
  /** Cambio aplicado por el toggle: true = hecho, false = deshecho. */
  done?: boolean;
}

/** Registra o deshace un hábito para hoy. */
export async function toggleHabit(habitId: string): Promise<HabitActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const todayKey = localDayKey();

  try {
    const { data: existing } = await supabase
      .from("habit_logs")
      .select("id")
      .eq("habit_id", habitId)
      .eq("log_date", todayKey)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("habit_logs").delete().eq("id", existing.id);
      if (error) return { error: "No se pudo deshacer. Inténtalo de nuevo." };
      revalidatePath("/", "layout");
      return { done: false };
    }

    const { error } = await supabase.from("habit_logs").insert({
      user_id: data.user.id,
      habit_id: habitId,
      log_date: todayKey,
    });
    if (error) return { error: "No se pudo registrar. Inténtalo de nuevo." };
    revalidatePath("/", "layout");
    return { done: true };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Añade un hábito activo. Máximo MAX_ACTIVE_HABITS activos. */
export async function addHabit(name: string): Promise<HabitActionState> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 60) {
    return { error: "El nombre del hábito debe tener entre 1 y 60 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const { count } = await supabase
      .from("habits")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    if (count !== null && count >= MAX_ACTIVE_HABITS) {
      return { error: `Puedes tener como mucho ${MAX_ACTIVE_HABITS} hábitos activos.` };
    }

    const { error } = await supabase
      .from("habits")
      .insert({ user_id: data.user.id, name: trimmed });
    if (error) return { error: "No se pudo crear el hábito. Inténtalo de nuevo." };
    revalidatePath("/", "layout");
    return { success: "Hábito añadido." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Desactiva un hábito (borrado lógico; conserva el historial). */
export async function removeHabit(habitId: string): Promise<HabitActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const { error } = await supabase
      .from("habits")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", habitId);
    if (error) return { error: "No se pudo eliminar el hábito." };
    revalidatePath("/", "layout");
    return { success: "Hábito eliminado." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}
