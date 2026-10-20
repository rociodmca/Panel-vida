import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";
import { localDayKey } from "@/lib/datetime";
import { weekdayIndex } from "@/lib/digest/schedule";
import { computeStreak, shiftDayKey } from "@/lib/streaks";
import type { GymSet, GymStatus } from "@/lib/types";

export type { GymSet, GymStatus };

/** Clave de día local YYYY-MM-DD para un número ISO de día (1=lunes…7=domingo) de esta semana. */
function weekDayKey(isoWeekday: number): string {
  const todayKey = localDayKey();
  const todayIndex = weekdayIndex();
  const diff = isoWeekday - todayIndex;
  return shiftDayKey(todayKey, diff);
}

const DEMO_STATUS: GymStatus = {
  todayLogged: false,
  streak: 0,
  weekDays: [false, false, false, false, false, false, false],
  weekCount: 0,
};

export async function getGymStatus(): Promise<GymStatus> {
  if (isDemoMode()) return DEMO_STATUS;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return DEMO_STATUS;

  const todayKey = localDayKey();
  // Trae los últimos 60 días para cubrir rachas largas y la semana actual.
  const sinceKey = shiftDayKey(todayKey, -60);
  const { data } = await supabase
    .from("gym_sessions")
    .select("session_date")
    .gte("session_date", sinceKey)
    .lte("session_date", todayKey)
    .order("session_date", { ascending: false });

  const dates = new Set((data ?? []).map((r) => r.session_date as string));
  const todayLogged = dates.has(todayKey);
  const streak = computeStreak(dates, todayKey);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    dates.has(weekDayKey(i + 1)),
  );
  const weekCount = weekDays.filter(Boolean).length;

  return { todayLogged, streak, weekDays, weekCount };
}

/** Series de la sesión de hoy (vacío si no hay sesión o no hay series). */
export async function getTodayGymSets(): Promise<GymSet[]> {
  if (isDemoMode()) return [];
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const todayKey = localDayKey();
  const { data: session } = await supabase
    .from("gym_sessions")
    .select("id")
    .eq("session_date", todayKey)
    .maybeSingle();
  if (!session) return [];

  const { data: sets } = await supabase
    .from("gym_sets")
    .select("*")
    .eq("session_id", session.id)
    .order("created_at", { ascending: true });

  return (sets as GymSet[]) ?? [];
}
