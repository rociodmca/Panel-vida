/**
 * Lectura del cuerpo de un correo de Gmail.
 *
 * El cuerpo NUNCA se guarda en la base de datos: se extrae en memoria, se
 * recorta y se devuelve para resumirlo en el momento. Todo lo que sale de
 * aquí es contenido de terceros y se trata como dato no confiable.
 */

export interface GmailPart {
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}

export interface ExtractedBody {
  text: string;
  hasAttachments: boolean;
  /** El correo tenía más de un cuerpo posible y se ha usado el de texto plano. */
  usedHtml: boolean;
}

const MAX_BODY_CHARS = 4000;

/** Decodifica base64url (el formato que usa la API de Gmail). */
export function decodeBase64Url(value: string): string {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return "";
  }
}

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&aacute;": "á",
  "&eacute;": "é",
  "&iacute;": "í",
  "&oacute;": "ó",
  "&uacute;": "ú",
  "&ntilde;": "ñ",
  "&Aacute;": "Á",
  "&Eacute;": "É",
  "&Iacute;": "Í",
  "&Oacute;": "Ó",
  "&Uacute;": "Ú",
  "&Ntilde;": "Ñ",
};

/** Convierte HTML en texto legible sin dependencias externas. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCharCode(value) : " ";
    })
    .replace(/&[a-zA-Z#0-9]+;/g, (entity) => HTML_ENTITIES[entity] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Recorre las partes del mensaje y devuelve el cuerpo legible.
 * Prefiere `text/plain`; si solo hay HTML, lo convierte.
 */
export function extractTextBody(payload: GmailPart | undefined): ExtractedBody {
  if (!payload) return { text: "", hasAttachments: false, usedHtml: false };

  const plain: string[] = [];
  const html: string[] = [];
  let hasAttachments = false;

  const walk = (part: GmailPart) => {
    if (part.filename) hasAttachments = true;
    const data = part.body?.data;
    if (data && part.mimeType === "text/plain") {
      plain.push(decodeBase64Url(data));
    } else if (data && part.mimeType === "text/html") {
      html.push(decodeBase64Url(data));
    }
    for (const child of part.parts ?? []) walk(child);
  };
  walk(payload);

  if (plain.length > 0) {
    return { text: plain.join("\n\n"), hasAttachments, usedHtml: false };
  }
  if (html.length > 0) {
    return { text: htmlToText(html.join("\n\n")), hasAttachments, usedHtml: true };
  }
  return { text: "", hasAttachments, usedHtml: false };
}

const QUOTE_MARKERS = [
  /^El mensaje original$/i,
  /^-----Original Message-----$/i,
  /^-{2,}\s*Original Message\s*-{2,}$/i,
  /^\s*On .{0,120}\bwrote:\s*$/i,
  /^\s*El .{0,80} original:/i,
  /^\s*En .{0,120}, .{0,80} escribi[oó]:/i,
];

/** Recorta la respuesta citada: solo interesa el texto original. */
export function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(">")) break;
    if (QUOTE_MARKERS.some((marker) => marker.test(trimmed))) break;
    kept.push(line);
  }
  return kept.join("\n").trim();
}

/** Normaliza espacios y líneas en blanco de más. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Recorta a un máximo de caracteres sin cortar a media palabra. */
export function truncateForPrompt(text: string, maxChars = MAX_BODY_CHARS): string {
  const clean = normalizeWhitespace(text);
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

/** Cuerpo listo para enviar al modelo: sin cita, sin ruido y recortado. */
export function prepareBodyForPrompt(text: string, maxChars = MAX_BODY_CHARS): string {
  return truncateForPrompt(normalizeWhitespace(stripQuotedReply(text)), maxChars);
}
