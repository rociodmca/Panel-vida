import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";
import { localDayKey } from "@/lib/datetime";
import { weekdayIndex } from "@/lib/digest/schedule";

export interface GymStatus {
  todayLogged: boolean;
  streak: number;
  /** 7 posiciones, lunes a domingo: true si hay sesión ese día. */
  weekDays: boolean[];
  weekCount: number;
}

/** Desplaza un día local YYYY-MM-DD n días (negativo = atrás). */
function shiftDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

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

  // Racha: cuenta consecutivos desde hoy (si está registrado) o desde ayer.
  let streak = 0;
  let cursor = todayLogged ? todayKey : shiftDayKey(todayKey, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    dates.has(weekDayKey(i + 1)),
  );
  const weekCount = weekDays.filter(Boolean).length;

  return { todayLogged, streak, weekDays, weekCount };
}
