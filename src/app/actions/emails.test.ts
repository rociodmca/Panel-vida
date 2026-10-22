import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EmailSummary } from "@/lib/ai/types";

const getUser = vi.fn(async () => ({ data: { user: { id: "user-1" } } }));
const upsert = vi.fn(async () => ({ error: null }));
const resolveGoogleToken = vi.fn();
const fetchMessageContent = vi.fn();
const summarizeEmail = vi.fn();
const getAiProvider = vi.fn(() => null);
const revalidatePath = vi.fn();

interface QueryBuilder {
  select: () => QueryBuilder;
  eq: () => QueryBuilder;
  limit: () => QueryBuilder;
  maybeSingle: () => Promise<{ data: unknown }>;
}

let message: Record<string, unknown> | null = null;
let preferences: Record<string, unknown> | null = { ai_enabled: true };

function tableRows(read: () => unknown): QueryBuilder {
  const builder: QueryBuilder = {
    select: () => builder,
    eq: () => builder,
    limit: () => builder,
    maybeSingle: async () => ({ data: read() }),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser },
    from: (table: string) => {
      if (table === "email_items_cache") return tableRows(() => message);
      if (table === "user_preferences") return tableRows(() => preferences);
      if (table === "email_summaries") return { upsert };
      throw new Error(`tabla no esperada: ${table}`);
    },
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/lib/integrations/google/credentials", () => ({
  resolveGoogleToken,
}));

vi.mock("@/lib/integrations/google/gmail", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/integrations/google/gmail")>();
  return { ...actual, fetchMessageContent };
});

vi.mock("@/lib/ai/summarize-email", () => ({ summarizeEmail }));

vi.mock("@/lib/ai/provider", () => ({ getAiProvider }));

async function runAction(messageId = "msg-1") {
  const { summarizeEmailAction } = await import("@/app/actions/emails");
  const form = new FormData();
  form.set("message_id", messageId);
  return summarizeEmailAction({}, form);
}

const resumenIa: EmailSummary = {
  resumen: "La factura de 68,40 € vence el día 27.",
  puntos: ["Importe: 68,40 €"],
  requiere_accion: true,
  tareas: [],
  fuente: "ia",
};

beforeEach(() => {
  vi.clearAllMocks();
  message = {
    external_id: "msg-1",
    subject: "Tu factura de la luz",
    sender_name: "Iberdrola",
    sender_email: "facturas@iberdrola.es",
    snippet: "Ya está disponible tu factura de 68,40 €. Vence el día 27.",
  };
  preferences = { ai_enabled: true };
  summarizeEmail.mockResolvedValue(resumenIa);
  resolveGoogleToken.mockResolvedValue({ ok: false, reason: "sin_conexion" });
});

describe("resumen de correo sin credencial de Gmail", () => {
  it("resume el fragmento sincronizado y lo avisa", async () => {
    const state = await runAction();

    expect(state.error).toBeUndefined();
    expect(state.summary?.fuente).toBe("ia");
    expect(state.notice).toContain("fragmento sincronizado");
    expect(fetchMessageContent).not.toHaveBeenCalled();
    expect(summarizeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Ya está disponible tu factura de 68,40 €. Vence el día 27.",
        fragmentOnly: true,
        from: "Iberdrola",
      }),
      { aiEnabled: true },
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ email_external_id: "msg-1", source: "ia" }),
      { onConflict: "user_id,email_external_id" },
    );
  });

  it("pide conectar Gmail si no hay ni cuerpo ni fragmento", async () => {
    message = { ...message, snippet: null };

    const state = await runAction();

    expect(state.summary).toBeUndefined();
    expect(state.error).toContain("Conecta Gmail");
    expect(summarizeEmail).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("respeta la IA desactivada del usuario", async () => {
    preferences = { ai_enabled: false };

    await runAction();

    expect(summarizeEmail).toHaveBeenCalledWith(expect.anything(), {
      aiEnabled: false,
    });
  });
});

describe("resumen de correo con Gmail disponible", () => {
  beforeEach(() => {
    resolveGoogleToken.mockResolvedValue({
      ok: true,
      token: "token",
      source: "integracion",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
    });
  });

  it("usa el cuerpo completo y no muestra aviso", async () => {
    fetchMessageContent.mockResolvedValue({
      subject: "Tu factura de la luz",
      from: "Iberdrola <facturas@iberdrola.es>",
      body: "Hola,\n\nYa está disponible tu factura. Vence el día 27.",
    });

    const state = await runAction();

    expect(state.notice).toBeUndefined();
    expect(state.summary?.fuente).toBe("ia");
    expect(summarizeEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Hola,\n\nYa está disponible tu factura. Vence el día 27.",
        fragmentOnly: false,
      }),
      { aiEnabled: true },
    );
  });

  it("cae al fragmento si Gmail deniega el cuerpo", async () => {
    const { GmailApiError } = await import(
      "@/lib/integrations/google/gmail"
    );
    fetchMessageContent.mockRejectedValue(new GmailApiError(403, "forbidden"));

    const state = await runAction();

    expect(state.error).toBeUndefined();
    expect(state.summary?.fuente).toBe("ia");
    expect(state.notice).toContain("permisos actuales");
    expect(summarizeEmail).toHaveBeenCalledWith(
      expect.objectContaining({ fragmentOnly: true }),
      { aiEnabled: true },
    );
  });

  it("no inventa un resumen si Gmail falla y no hay fragmento", async () => {
    const { GmailApiError } = await import(
      "@/lib/integrations/google/gmail"
    );
    message = { ...message, snippet: null };
    fetchMessageContent.mockRejectedValue(new GmailApiError(500, "boom"));

    const state = await runAction();

    expect(state.summary).toBeUndefined();
    expect(state.error).toContain("No se pudo leer el correo");
    expect(summarizeEmail).not.toHaveBeenCalled();
  });
});

describe("validación de la entrada", () => {
  it("rechaza un mensaje vacío", async () => {
    const state = await runAction("");

    expect(state.error).toBe("No se indicó el mensaje.");
    expect(summarizeEmail).not.toHaveBeenCalled();
  });
});
