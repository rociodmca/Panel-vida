"use server";

import { revalidatePath } from "next/cache";
import { localDayKey } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface GymActionState {
  error?: string;
  /** Cambio aplicado: true = registrado, false = quitado. */
  logged?: boolean;
}

export interface GymSetActionState {
  error?: string;
}

/**
 * Registra o quita el entrenamiento de hoy.
 * Si ya existe el día, se elimina (deshacer); si no, se crea.
 */
export async function toggleGymLog(): Promise<GymActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const todayKey = localDayKey();

  try {
    const { data: existing } = await supabase
      .from("gym_sessions")
      .select("id")
      .eq("session_date", todayKey)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("gym_sessions")
        .delete()
        .eq("id", existing.id);
      if (error) return { error: "No se pudo deshacer. Inténtalo de nuevo." };
      revalidatePath("/", "layout");
      return { logged: false };
    }

    const { error } = await supabase
      .from("gym_sessions")
      .insert({ user_id: data.user.id, session_date: todayKey });
    if (error) return { error: "No se pudo registrar. Inténtalo de nuevo." };
    revalidatePath("/", "layout");
    return { logged: true };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Añade una serie a la sesión de hoy (requiere sesión registrada). */
export async function addGymSet(input: {
  exercise: string;
  reps: number;
  weightKg: number | null;
}): Promise<GymSetActionState> {
  const exercise = input.exercise.trim();
  if (!exercise || exercise.length > 120) {
    return { error: "El ejercicio debe tener entre 1 y 120 caracteres." };
  }
  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > 500) {
    return { error: "Las repeticiones deben estar entre 1 y 500." };
  }
  if (
    input.weightKg !== null &&
    (!Number.isFinite(input.weightKg) || input.weightKg < 0 || input.weightKg > 500)
  ) {
    return { error: "El peso debe estar entre 0 y 500 kg." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const todayKey = localDayKey();
    const { data: session } = await supabase
      .from("gym_sessions")
      .select("id")
      .eq("session_date", todayKey)
      .maybeSingle();
    if (!session) {
      return { error: "Registra primero el entrenamiento de hoy." };
    }

    const { error } = await supabase.from("gym_sets").insert({
      user_id: data.user.id,
      session_id: session.id,
      exercise,
      reps: input.reps,
      weight_kg: input.weightKg,
    });
    if (error) return { error: "No se pudo añadir la serie." };
    revalidatePath("/", "layout");
    return {};
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Elimina una serie propia. */
export async function deleteGymSet(id: string): Promise<GymSetActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const { error } = await supabase.from("gym_sets").delete().eq("id", id);
    if (error) return { error: "No se pudo eliminar la serie." };
    revalidatePath("/", "layout");
    return {};
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}
