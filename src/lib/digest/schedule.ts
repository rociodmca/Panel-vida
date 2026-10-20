import { DEFAULT_TIMEZONE } from "@/lib/config";

/**
 * Reglas de programación del resumen matinal.
 *
 * Convención de días: ISO smallint[] con 1 = lunes … 7 = domingo
 * (igual que `digest_days` en la base de datos).
 */

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** Índice ISO del día de la semana en la zona horaria local (1 = lunes … 7 = domingo). */
export function weekdayIndex(value: Date = new Date()): number {
  const short = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: DEFAULT_TIMEZONE,
  }).format(value);
  return WEEKDAY_INDEX[short] ?? 0;
}

/**
 * Ventana tolerante de envío: basta con que la hora local ya haya llegado.
 * (Vercel Hobby ejecuta el cron dentro de una hora fija; no se promete
 * precisión al minuto, así que se compara por hora.)
 */
export function isDigestWindowOpen(
  currentTimeKey: string,
  digestLocalTime: string,
): boolean {
  const currentHour = Number(currentTimeKey.slice(0, 2));
  const digestHour = Number(digestLocalTime.slice(0, 2));
  if (Number.isNaN(currentHour) || Number.isNaN(digestHour)) return false;
  return currentHour >= digestHour;
}

export interface DigestSchedule {
  currentTimeKey: string;
  digestLocalTime: string;
  digestDays: number[];
  weekday: number;
}

/** true si toca enviar el resumen en este instante para este usuario. */
export function shouldSendDigest({
  currentTimeKey,
  digestLocalTime,
  digestDays,
  weekday,
}: DigestSchedule): boolean {
  if (!digestDays.includes(weekday)) return false;
  return isDigestWindowOpen(currentTimeKey, digestLocalTime);
}
