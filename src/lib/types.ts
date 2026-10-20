export type TaskPriority = "baja" | "media" | "alta";
export type TaskStatus = "pendiente" | "completada" | "archivada";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  label: string | null;
  source: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  external_url: string | null;
  calendar_name: string;
}

export interface EmailItem {
  id: string;
  sender_name: string | null;
  sender_email: string;
  subject: string;
  received_at: string;
  is_unread: boolean;
  is_important: boolean;
  external_url: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  log_date: string;
  hours: number;
  energy: number;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  log_date: string;
  gratitude_1: string;
  gratitude_2: string | null;
  gratitude_3: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export interface GymSet {
  id: string;
  user_id: string;
  session_id: string;
  exercise: string;
  reps: number;
  weight_kg: number | null;
  created_at: string;
}

/** Estado de un hábito para la vista (seguro para componentes cliente). */
export interface HabitStatus {
  id: string;
  name: string;
  doneToday: boolean;
  /** Días consecutivos que terminan hoy (o ayer si hoy aún no). */
  streak: number;
}

export interface HabitsStatus {
  habits: HabitStatus[];
  activeCount: number;
}

/** Tope de hábitos activos simultáneos. */
export const MAX_ACTIVE_HABITS = 6;

/** Estado del registro de gimnasio para la vista (seguro para cliente). */
export interface GymStatus {
  todayLogged: boolean;
  /** Días consecutivos que terminan hoy (o ayer si hoy aún no). */
  streak: number;
  /** 7 posiciones (lunes…domingo) con el entrenamiento de esa semana. */
  weekDays: boolean[];
  weekCount: number;
}

/** Registro de sueño/micro-diario de hoy para los formularios (seguro para cliente). */
export interface WellnessToday {
  sleep: SleepLog | null;
  journal: JournalEntry | null;
}

export type IntegrationStatus = "conectado" | "error" | "revocado";

export interface Integration {
  id: string;
  provider: "google_calendar" | "gmail";
  status: IntegrationStatus;
  scopes: string[];
  last_synced_at: string | null;
}

export interface UserProfile {
  display_name: string | null;
  timezone: string;
  locale: string;
}

export interface DigestPreferences {
  digest_enabled: boolean;
  digest_local_time: string;
  digest_days: number[];
  digest_email: string;
  week_start: "domingo" | "lunes";
}

export const DEFAULT_DIGEST_PREFERENCES: DigestPreferences = {
  digest_enabled: false,
  digest_local_time: "07:00",
  digest_days: [1, 2, 3, 4, 5],
  digest_email: "",
  week_start: "lunes",
};

/** 1=lunes … 7=domingo, alineado con ISO-8601. */
export const DAY_LABELS: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};
