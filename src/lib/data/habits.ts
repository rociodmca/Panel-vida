import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";
import { localDayKey } from "@/lib/datetime";
import { computeStreak, shiftDayKey } from "@/lib/streaks";
import type { HabitsStatus, HabitStatus } from "@/lib/types";

export type { HabitsStatus, HabitStatus };
export const MAX_ACTIVE_HABITS = 6;

const DEMO_STATUS: HabitsStatus = { habits: [], activeCount: 0 };

export async function getHabitsStatus(): Promise<HabitsStatus> {
  if (isDemoMode()) return DEMO_STATUS;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return DEMO_STATUS;

  const todayKey = localDayKey();
  const sinceKey = shiftDayKey(todayKey, -60);

  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name")
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("habit_id, log_date")
      .gte("log_date", sinceKey)
      .lte("log_date", todayKey),
  ]);

  const logsByHabit = new Map<string, Set<string>>();
  for (const log of logs ?? []) {
    const set = logsByHabit.get(log.habit_id) ?? new Set<string>();
    set.add(log.log_date as string);
    logsByHabit.set(log.habit_id, set);
  }

  const items: HabitStatus[] = (habits ?? []).map((habit) => {
    const dates = logsByHabit.get(habit.id) ?? new Set<string>();
    return {
      id: habit.id,
      name: habit.name as string,
      doneToday: dates.has(todayKey),
      streak: computeStreak(dates, todayKey),
    };
  });

  return { habits: items, activeCount: items.length };
}
