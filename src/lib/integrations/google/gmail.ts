import type { EmailMetaDraft } from "@/lib/integrations/types";

const MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

interface GmailMessageList {
  messages?: Array<{ id: string; threadId: string }>;
}

interface GmailMessage {
  id: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
  labelIds?: string[];
  internalDate?: string;
}

function headerValue(message: GmailMessage, name: string): string | null {
  const header = message.payload?.headers?.find(
    (h) => h.name.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? null;
}

/**
 * Lista metadatos de mensajes recientes (remintente, asunto, fecha, etiquetas).
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
    .map((message) => {
      const from = headerValue(message, "From") ?? "";
      const match = from.match(/^(.*)<(.+)>$/);
      const senderEmail = (match?.[2] ?? from).trim() || "desconocido";
      const senderName = match?.[1]?.trim().replaceAll(/^"|"$/g, "") || null;
      const labels = message.labelIds ?? [];
      return {
        externalId: message.id,
        senderName,
        senderEmail,
        subject: headerValue(message, "Subject") ?? "(Sin asunto)",
        receivedAt: message.internalDate
          ? new Date(Number(message.internalDate)).toISOString()
          : new Date().toISOString(),
        isUnread: labels.includes("UNREAD"),
        isImportant: labels.includes("IMPORTANT") || labels.includes("STARRED"),
        externalUrl: `https://mail.google.com/mail/u/0/#inbox/${message.id}`,
      } satisfies EmailMetaDraft;
    });
}

export async function fetchGmailProfile(accessToken: string): Promise<{ email: string; emailAddress: string }> {
  const response = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Perfil de Gmail falló (${response.status})`);
  return (await response.json()) as { email: string; emailAddress: string };
}
