import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/config";
import { localDayKey } from "@/lib/datetime";
import type { JournalEntry, SleepLog, WellnessToday } from "@/lib/types";

export type { WellnessToday };

const DEMO_STATUS: WellnessToday = { sleep: null, journal: null };

export async function getWellnessToday(): Promise<WellnessToday> {
  if (isDemoMode()) return DEMO_STATUS;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return DEMO_STATUS;

  const todayKey = localDayKey();
  const [sleepRes, journalRes] = await Promise.all([
    supabase
      .from("sleep_logs")
      .select("*")
      .eq("log_date", todayKey)
      .maybeSingle(),
    supabase
      .from("journal_entries")
      .select("*")
      .eq("log_date", todayKey)
      .maybeSingle(),
  ]);

  return {
    sleep: (sleepRes.data as SleepLog | null) ?? null,
    journal: (journalRes.data as JournalEntry | null) ?? null,
  };
}
