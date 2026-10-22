import { describe, expect, it, vi } from "vitest";
import { listRecentMessageMetadata, toEmailMetaDraft, type GmailMessage } from "./gmail";

function gmailMessage(overrides: Record<string, unknown> = {}): GmailMessage {
  return {
    id: "msg-1",
    snippet: "Buenos días, adjunto el informe solicitado.",
    internalDate: String(Date.parse("2026-03-10T08:00:00.000Z")),
    labelIds: ["INBOX", "UNREAD", "IMPORTANT"],
    payload: {
      headers: [
        { name: "From", value: "Ayuntamiento <notificaciones@ayuntamiento.example>" },
        { name: "Subject", value: "Recordatorio: cita para trámite municipal" },
      ],
    },
    ...overrides,
  } as GmailMessage;
}

describe("metadatos de Gmail", () => {
  it("extrae remitente, asunto, fecha y etiquetas", () => {
    const draft = toEmailMetaDraft(gmailMessage());

    expect(draft.externalId).toBe("msg-1");
    expect(draft.senderName).toBe("Ayuntamiento");
    expect(draft.senderEmail).toBe("notificaciones@ayuntamiento.example");
    expect(draft.subject).toBe("Recordatorio: cita para trámite municipal");
    expect(draft.receivedAt).toBe("2026-03-10T08:00:00.000Z");
    expect(draft.isUnread).toBe(true);
    expect(draft.isImportant).toBe(true);
    expect(draft.snippet).toBe("Buenos días, adjunto el informe solicitado.");
    expect(draft.externalUrl).toContain("mail.google.com");
  });

  it("no guarda el cuerpo del mensaje", () => {
    const draft = toEmailMetaDraft(gmailMessage());
    expect(JSON.stringify(draft)).not.toContain("body");
    expect(Object.keys(draft)).not.toContain("body");
  });

  it("tolera remitentes sin nombre y mensajes sin asunto", () => {
    const draft = toEmailMetaDraft(
      gmailMessage({
        payload: { headers: [{ name: "From", value: "alguien@example.com" }] },
      }),
    );
    expect(draft.senderName).toBeNull();
    expect(draft.senderEmail).toBe("alguien@example.com");
    expect(draft.subject).toBe("(Sin asunto)");
  });

  it("calcula el motivo de relevancia según importance y lectura", () => {
    const importante = toEmailMetaDraft(gmailMessage());
    expect(importante.relevanceReason).toBe("Marcado como importante");
    expect(importante.relevanceScore).toBe(1);
  });

  it("lista mensajes del buzón usando solo metadatos", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/messages?")) {
        return new Response(
          JSON.stringify({ messages: [{ id: "msg-1", threadId: "t-1" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify(gmailMessage()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const drafts = await listRecentMessageMetadata("token", 10);

    expect(drafts).toHaveLength(1);
    expect(drafts[0].subject).toBe("Recordatorio: cita para trámite municipal");
    const detailCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/messages/msg-1"),
    );
    expect(String(detailCall?.[0])).toContain("format=metadata");
    expect(String(detailCall?.[0])).toContain("metadataHeaders=Subject");
  });
});
