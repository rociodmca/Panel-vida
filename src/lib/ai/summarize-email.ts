import { getAiProvider, EMAIL_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/provider";
import type { AiProvider, EmailSummary, SummaryReason } from "@/lib/ai/types";

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
  let data = parseJsonObject(cleaned);
  if (!data || typeof data !== "object") {
    // Recuperación tolerante: JSON truncado o con comas finales.
    data = extractFields(cleaned);
  }
  if (!data || typeof data !== "object") {
    logUnparsedResponse(cleaned);
    return null;
  }
  const record = data as Record<string, unknown>;

  const resumen = typeof record.resumen === "string" ? record.resumen.trim() : "";
  if (!resumen) {
    logUnparsedResponse(cleaned);
    return null;
  }

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

/**
 * Último recurso cuando la respuesta no es JSON válido (p. ej. truncada por
 * el límite de tokens): se leen los campos con expresiones regulares.
 */
function extractFields(text: string): Record<string, unknown> | null {
  const resumen = matchString(text, "resumen");
  if (!resumen) return null;
  return {
    resumen,
    puntos: matchStringArray(text, "puntos"),
    tareas: matchStringArray(text, "tareas"),
    requiere_accion: /"requiere_accion"\s*:\s*true/.test(text),
  };
}

function matchString(text: string, field: string): string | null {
  const regex = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const match = regex.exec(text);
  if (!match) return null;
  const value = match[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
  return value || null;
}

function matchStringArray(text: string, field: string): string[] {
  const regex = new RegExp(`"${field}"\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const match = regex.exec(text);
  if (!match) return [];
  return [...match[1].matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)]
    .map((item) => item[1].replace(/\\"/g, '"').trim())
    .filter(Boolean);
}

/**
 * Diagnóstico sin contenido: solo forma de la respuesta, para saber si el
 * proveedor devolvió prosa, JSON truncado u otra estructura.
 */
function logUnparsedResponse(text: string): void {
  let parsedShape: string | null = null;
  try {
    const parsed = JSON.parse(text) as unknown;
    parsedShape =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? Object.keys(parsed as Record<string, unknown>).join(",")
        : Array.isArray(parsed)
          ? "array"
          : typeof parsed;
  } catch {
    parsedShape = null;
  }
  console.warn(
    JSON.stringify({
      event: "ai_summary_unparsed",
      length: text.length,
      starts_with_brace: text.startsWith("{"),
      ends_with_brace: text.endsWith("}"),
      has_fence: text.includes("```"),
      parse_ok: parsedShape !== null,
      keys: parsedShape,
    }),
  );
}

/**
 * Extrae el objeto JSON de la respuesta del modelo. Algunos proveedores
 * añaden texto alrededor del JSON o lo envuelven en bloques ```json.
 */
function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Continúa con la extracción de un bloque JSON dentro del texto.
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function isNoise(line: string): boolean {
  const lower = line.toLowerCase();
  return NOISE_LINES.some((noise) => lower.includes(noise));
}

/** Resumen sin IA: heurística simple sobre el texto del correo. */
export function deterministicSummary(
  email: EmailToSummarize,
  motivo?: SummaryReason,
): EmailSummary {
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
    ...(motivo ? { motivo } : {}),
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
  if (!options.aiEnabled) return deterministicSummary(email, "desactivada");

  const provider = options.provider ?? getAiProvider();
  if (!provider) return deterministicSummary(email, "sin_proveedor");

  const raw = await provider.complete(
    buildSummaryPrompt(email),
    EMAIL_SUMMARY_SYSTEM_PROMPT,
  );
  if (!raw) return deterministicSummary(email, "error_proveedor");

  const parsed = parseAiSummary(raw);
  return parsed ?? deterministicSummary(email, "respuesta_invalida");
}
