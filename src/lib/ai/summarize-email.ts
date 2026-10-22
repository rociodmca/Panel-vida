import { getAiProvider, EMAIL_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/provider";
import type { AiProvider, EmailSummary } from "@/lib/ai/types";

/**
 * Resumen de un correo.
 *
 * Con proveedor de IA configurado se pide un JSON estructurado; si no lo hay,
 * si falla o si devuelve algo que no se puede validar, se usa el resumen
 * determinista. El resultado siempre es texto plano para mostrar.
 */

export interface EmailToSummarize {
  subject: string;
  from: string;
  body: string;
}

const MAX_RESUMEN_CHARS = 400;
const MAX_POINT_CHARS = 200;
const MAX_POINTS = 5;
const MAX_TAREAS = 3;

const ACTION_HINTS = [
  "responde",
  "responder",
  "revisa",
  "revisar",
  "confirma",
  "confirmar",
  "firma",
  "firmar",
  "adjunto",
  "adjunta",
  "plazo",
  "vence",
  "caduca",
  "necesito",
  "urgente",
  "action required",
  "please review",
  "deadline",
];

const NOISE_LINES = [
  "enviado desde",
  "el mismo dispositivo",
  "unsubscribe",
  "darse de baja",
  "confidentialidad",
  "aviso legal",
  "disclaimer",
];

export function buildSummaryPrompt(email: EmailToSummarize): string {
  return [
    "Resume este correo.",
    "<correo>",
    `Asunto: ${email.subject}`,
    `De: ${email.from}`,
    "---",
    email.body,
    "</correo>",
  ].join("\n");
}

/** Valida y normaliza la respuesta del modelo. */
export function parseAiSummary(raw: string): EmailSummary | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let data: unknown;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;

  const resumen = typeof record.resumen === "string" ? record.resumen.trim() : "";
  if (!resumen) return null;

  const puntos = Array.isArray(record.puntos)
    ? record.puntos
        .filter((punto): punto is string => typeof punto === "string")
        .map((punto) => truncate(punto.trim(), MAX_POINT_CHARS))
        .filter(Boolean)
        .slice(0, MAX_POINTS)
    : [];

  const tareas = Array.isArray(record.tareas)
    ? record.tareas
        .filter((tarea): tarea is string => typeof tarea === "string")
        .map((tarea) => truncate(tarea.trim(), MAX_POINT_CHARS))
        .filter(Boolean)
        .slice(0, MAX_TAREAS)
    : [];

  return {
    resumen: truncate(resumen, MAX_RESUMEN_CHARS),
    puntos,
    requiere_accion:
      typeof record.requiere_accion === "boolean"
        ? record.requiere_accion
        : ACTION_HINTS.some((hint) => resumen.toLowerCase().includes(hint)),
    tareas,
    fuente: "ia",
  };
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function isNoise(line: string): boolean {
  const lower = line.toLowerCase();
  return NOISE_LINES.some((noise) => lower.includes(noise));
}

/** Resumen sin IA: heurística simple sobre el texto del correo. */
export function deterministicSummary(email: EmailToSummarize): EmailSummary {
  const lines = email.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isNoise(line));

  const firstParagraph = email.body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 20);

  const resumen = truncate(
    (firstParagraph ?? lines.slice(0, 2).join(" ")).replace(/\s+/g, " "),
    MAX_RESUMEN_CHARS,
  ) || email.subject;

  const puntos = lines
    .filter((line) => line.length > 12 && line.length < 220)
    .filter((line) => !/^[-–—>•\s]*$/.test(line))
    .slice(0, MAX_POINTS)
    .map((line) => truncate(line.replace(/^[-–—•*\s]+/, ""), MAX_POINT_CHARS));

  const haystack = `${email.subject}\n${email.body}`.toLowerCase();
  const requiereAccion = ACTION_HINTS.some((hint) => haystack.includes(hint));

  const tareas = requiereAccion
    ? puntos
        .filter((punto) =>
          ACTION_HINTS.some((hint) => punto.toLowerCase().includes(hint)),
        )
        .slice(0, MAX_TAREAS)
    : [];

  return {
    resumen,
    puntos: [...new Set(puntos)],
    requiere_accion: requiereAccion,
    tareas,
    fuente: "determinista",
  };
}

export interface SummarizeOptions {
  /** Si es false, no se envía nada a un proveedor externo. */
  aiEnabled: boolean;
  provider?: AiProvider | null;
}

/** Resumen de un correo con IA si está permitida y disponible; si no, determinista. */
export async function summarizeEmail(
  email: EmailToSummarize,
  options: SummarizeOptions,
): Promise<EmailSummary> {
  if (!options.aiEnabled) return deterministicSummary(email);

  const provider = options.provider ?? getAiProvider();
  if (!provider) return deterministicSummary(email);

  const raw = await provider.complete(
    buildSummaryPrompt(email),
    EMAIL_SUMMARY_SYSTEM_PROMPT,
  );
  if (!raw) return deterministicSummary(email);

  const parsed = parseAiSummary(raw);
  return parsed ?? deterministicSummary(email);
}
