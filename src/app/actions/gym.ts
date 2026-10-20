"use server";

import { revalidatePath } from "next/cache";
import { localDayKey } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface GymActionState {
  error?: string;
  /** Cambio aplicado: true = registrado, false = quitado. */
  logged?: boolean;
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
