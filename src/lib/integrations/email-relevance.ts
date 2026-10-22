/**
 * Relevancia del correo: reglas simples, deterministas y explicables.
 * El MVP no usa IA: el motivo se muestra siempre al usuario.
 */

export type RelevanceCode = "importante" | "no_leido" | "reciente" | "informativo";

export interface Relevance {
  code: RelevanceCode;
  /** 0–1, para ordenar el buzón. */
  score: number;
  /** Motivo legible en español. */
  label: string;
}

export interface RelevanceInput {
  isUnread: boolean;
  isImportant: boolean;
  receivedAt: string | Date;
  /** Referencia temporal; por defecto, el momento actual. */
  now?: Date;
}

const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function computeRelevance(input: RelevanceInput): Relevance {
  if (input.isImportant) {
    return { code: "importante", score: 1, label: "Marcado como importante" };
  }
  if (input.isUnread) {
    return { code: "no_leido", score: 0.7, label: "No leído" };
  }

  const received = new Date(input.receivedAt).getTime();
  const now = (input.now ?? new Date()).getTime();
  if (Number.isFinite(received) && now - received <= RECENT_WINDOW_MS) {
    return { code: "reciente", score: 0.4, label: "Reciente" };
  }
  return { code: "informativo", score: 0.1, label: "Sin marca de prioridad" };
}
