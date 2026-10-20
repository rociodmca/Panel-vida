"use server";

import { revalidatePath } from "next/cache";
import { localDayKey } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface WellnessActionState {
  error?: string;
  success?: string;
}

/** Guarda (o corrige) el registro de sueño y energía de hoy. */
export async function saveSleepLog(
  _prev: WellnessActionState,
  formData: FormData,
): Promise<WellnessActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const hours = Number(formData.get("hours"));
  const energy = Number(formData.get("energy"));
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
    return { error: "Las horas de sueño deben estar entre 0 y 24." };
  }
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) {
    return { error: "La energía debe ser un valor entre 1 y 5." };
  }

  try {
    const todayKey = localDayKey();
    const { error } = await supabase.from("sleep_logs").upsert(
      {
        user_id: data.user.id,
        log_date: todayKey,
        hours,
        energy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date" },
    );
    if (error) return { error: "No se pudo guardar el registro de sueño." };
    revalidatePath("/", "layout");
    return { success: "Registro de sueño guardado." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}

/** Guarda (o corrige) el micro-diario de hoy: 3 gratitudes + reflexión. */
export async function saveJournalEntry(
  _prev: WellnessActionState,
  formData: FormData,
): Promise<WellnessActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const gratitude1 = String(formData.get("gratitude_1") ?? "").trim();
  const gratitude2 = String(formData.get("gratitude_2") ?? "").trim();
  const gratitude3 = String(formData.get("gratitude_3") ?? "").trim();
  const reflection = String(formData.get("reflection") ?? "").trim();

  if (!gratitude1) {
    return { error: "Escribe al menos una gratitud." };
  }
  if (
    gratitude1.length > 300 ||
    gratitude2.length > 300 ||
    gratitude3.length > 300 ||
    reflection.length > 2000
  ) {
    return { error: "Una de las respuestas es demasiado larga." };
  }

  try {
    const todayKey = localDayKey();
    const { error } = await supabase.from("journal_entries").upsert(
      {
        user_id: data.user.id,
        log_date: todayKey,
        gratitude_1: gratitude1,
        gratitude_2: gratitude2 || null,
        gratitude_3: gratitude3 || null,
        reflection: reflection || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,log_date" },
    );
    if (error) return { error: "No se pudo guardar el micro-diario." };
    revalidatePath("/", "layout");
    return { success: "Micro-diario guardado." };
  } catch {
    return { error: "La operación ha fallado. Inténtalo de nuevo." };
  }
}
