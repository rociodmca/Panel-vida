import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@/lib/config";

const dateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: DEFAULT_TIMEZONE,
});

const longDateFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: DEFAULT_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: DEFAULT_TIMEZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  weekday: "long",
  timeZone: DEFAULT_TIMEZONE,
});

const monthDayFormatter = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: DEFAULT_TIMEZONE,
});

/** dd/mm/aaaa en la zona horaria por defecto. */
export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

/** Fecha larga en español, p. ej. "martes, 20 de octubre de 2026". */
export function formatLongDate(value: Date | string): string {
  const raw = longDateFormatter.format(new Date(value));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Hora en formato 24 h, p. ej. "07:30". */
export function formatTime(value: Date | string): string {
  return timeFormatter.format(new Date(value));
}

export function formatWeekday(value: Date | string): string {
  const raw = weekdayFormatter.format(new Date(value));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatMonthDay(value: Date | string): string {
  return monthDayFormatter.format(new Date(value));
}

/** Clave de día local YYYY-MM-DD en la zona horaria configurada. */
export function localDayKey(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DEFAULT_TIMEZONE,
  }).format(value);
}

/** Hora local HH:mm en la zona horaria configurada. */
export function localTimeKey(value: Date = new Date()): string {
  return timeFormatter.format(value);
}

export function isOverdue(dueAt: string | null, status: string): boolean {
  if (!dueAt || status === "completada" || status === "archivada") return false;
  return new Date(dueAt).getTime() < Date.now();
}

export function isToday(value: Date | string): boolean {
  return localDayKey(new Date(value)) === localDayKey();
}

export function greetingForHour(hour: number): string {
  if (hour < 14) return "Buenos días";
  if (hour < 21) return "Buenas tardes";
  return "Buenas noches";
}

export function currentGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: DEFAULT_TIMEZONE,
    }).format(new Date()),
  );
  return greetingForHour(hour);
}
