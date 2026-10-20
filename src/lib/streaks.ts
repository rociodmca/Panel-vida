/** Matemática de días locales compartida por hábitos y gimnasio. */

/** Desplaza un día local YYYY-MM-DD n días (negativo = atrás). */
export function shiftDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Racha de días consecutivos que termina hoy (si `dates` incluye hoy) o ayer.
 * `dates` usa claves locales YYYY-MM-DD.
 */
export function computeStreak(dates: ReadonlySet<string>, todayKey: string): number {
  let streak = 0;
  let cursor = dates.has(todayKey) ? todayKey : shiftDayKey(todayKey, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDayKey(cursor, -1);
  }
  return streak;
}
