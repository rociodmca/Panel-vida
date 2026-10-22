import { computeRelevance } from "@/lib/integrations/email-relevance";
import {
  extractTextBody,
  prepareBodyForPrompt,
  type GmailPart,
} from "@/lib/integrations/google/gmail-content";
import type { EmailMetaDraft } from "@/lib/integrations/types";

const MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

interface GmailMessageList {
  messages?: Array<{ id: string; threadId: string }>;
}

interface GmailMessage {
  id: string;
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  } & GmailPart;
  labelIds?: string[];
  internalDate?: string;
}

export type { GmailMessage };

function headerValue(message: GmailMessage, name: string): string | null {
  const header = message.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? null;
}

/**
 * Lista metadatos de mensajes recientes (remitente, asunto, fecha, etiquetas).
 * NO descarga cuerpos ni adjuntos: el MVP solo usa metadatos.
 */
export async function listRecentMessageMetadata(
  accessToken: string,
  maxResults = 10,
): Promise<EmailMetaDraft[]> {
  const listResponse = await fetch(
    `${MESSAGES_URL}?maxResults=${maxResults}&labelIds=INBOX`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listResponse.ok) throw new Error(`Lista de mensajes falló (${listResponse.status})`);
  const list = (await listResponse.json()) as GmailMessageList;

  const messages = await Promise.all(
    (list.messages ?? []).map(async ({ id }) => {
      const response = await fetch(
        `${MESSAGES_URL}/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) return null;
      return (await response.json()) as GmailMessage;
    }),
  );

  return messages
    .filter((message): message is GmailMessage => message !== null)
    .map((message) => toEmailMetaDraft(message));
}

/** Traduce la respuesta de Gmail al modelo de la caché local. */
export function toEmailMetaDraft(message: GmailMessage): EmailMetaDraft {
  const from = headerValue(message, "From") ?? "";
  const match = from.match(/^(.*)<(.+)>$/);
  const senderEmail = (match?.[2] ?? from).trim() || "desconocido";
  const senderName = match?.[1]?.trim().replaceAll(/^"|"$/g, "") || null;
  const labels = message.labelIds ?? [];
  const receivedAt = message.internalDate
    ? new Date(Number(message.internalDate)).toISOString()
    : new Date().toISOString();
  const isUnread = labels.includes("UNREAD");
  const isImportant = labels.includes("IMPORTANT") || labels.includes("STARRED");
  const relevance = computeRelevance({ isUnread, isImportant, receivedAt });

  return {
    externalId: message.id,
    senderName,
    senderEmail,
    subject: headerValue(message, "Subject") ?? "(Sin asunto)",
    snippet: message.snippet?.trim() ? message.snippet.trim() : null,
    receivedAt,
    isUnread,
    isImportant,
    relevanceScore: relevance.score,
    relevanceReason: relevance.label,
    externalUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
  };
}

export async function fetchGmailProfile(accessToken: string): Promise<{ email: string; emailAddress: string }> {
  const response = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Perfil de Gmail falló (${response.status})`);
  return (await response.json()) as { email: string; emailAddress: string };
}

/** Error de la API de Gmail con su código HTTP, para dar mensajes útiles. */
export class GmailApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GmailApiError";
    this.status = status;
  }
}

export interface MessageContent {
  id: string;
  subject: string;
  from: string;
  snippet: string | null;
  /** Cuerpo limpio y recortado, listo para resumir. */
  body: string;
  hasAttachments: boolean;
  receivedAt: string;
  labelIds: string[];
}

/**
 * Descarga el contenido de un mensaje para resumirlo en el momento.
 * Requiere el scope `gmail.readonly`; el cuerpo no se guarda en ninguna tabla.
 */
export async function fetchMessageContent(
  accessToken: string,
  messageId: string,
): Promise<MessageContent> {
  const response = await fetch(
    `${MESSAGES_URL}/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new GmailApiError(
      response.status,
      `No se pudo leer el mensaje (${response.status})`,
    );
  }
  const message = (await response.json()) as GmailMessage;
  const extracted = extractTextBody(message.payload);

  return {
    id: message.id,
    subject: headerValue(message, "Subject") ?? "(Sin asunto)",
    from: headerValue(message, "From") ?? "",
    snippet: message.snippet?.trim() ? message.snippet.trim() : null,
    body: prepareBodyForPrompt(extracted.text),
    hasAttachments: extracted.hasAttachments,
    receivedAt: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString(),
    labelIds: message.labelIds ?? [],
  };
}
