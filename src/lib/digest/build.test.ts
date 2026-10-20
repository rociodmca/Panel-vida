import { describe, expect, it } from "vitest";
import { buildDigest, buildDigestEmail, type DigestData } from "@/lib/digest/build";

function emptyData(overrides: Partial<DigestData> = {}): DigestData {
  return {
    displayName: null,
    localDate: new Date("2026-10-20T08:00:00Z"),
    events: [],
    tasks: [],
    emails: [],
    integrationsAvailable: false,
    ...overrides,
  };
}

describe("buildDigest (plantilla determinista)", () => {
  it("siempre incluye las cuatro secciones y el pie", () => {
    const text = buildDigest(emptyData());
    expect(text).toContain("AGENDA DE HOY");
    expect(text).toContain("TAREAS PRIORITARIAS");
    expect(text).toContain("TAREAS VENCIDAS");
    expect(text).toContain("MENSAJES DESTACADOS");
    expect(text).toContain("Panel de vida");
  });

  it("ofrece el siguiente paso cuando no hay integraciones", () => {
    const text = buildDigest(emptyData({ integrationsAvailable: false }));
    expect(text).toContain("Conecta Google Calendar o Gmail en Ajustes");
  });

  it("distingue 'sin mensajes' de 'sin integraciones'", () => {
    const text = buildDigest(emptyData({ integrationsAvailable: true }));
    expect(text).toContain("No hay mensajes recientes");
    expect(text).not.toContain("Conecta Google Calendar");
  });

  it("limita las prioritarias a tres", () => {
    const tasks = Array.from({ length: 6 }, (_, index) => ({
      id: `t-${index}`,
      title: `Tarea ${index}`,
      due_at: null,
      priority: "alta",
      status: "pendiente",
    }));
    const text = buildDigest(emptyData({ tasks }));
    const lineas = text
      .split("\n")
      .filter((line) => line.startsWith("- Tarea "));
    expect(lineas).toHaveLength(3);
  });

  it("omite vencidas completadas", () => {
    const text = buildDigest(
      emptyData({
        tasks: [
          {
            id: "t-1",
            title: "Hecha ayer",
            due_at: "2020-01-01T00:00:00Z",
            priority: "alta",
            status: "completada",
          },
        ],
      }),
    );
    expect(text).toContain("- Nada vencido. Buen trabajo.");
    expect(text).not.toContain("Hecha ayer");
  });

  it("omite clima y frase cuando no están presentes", () => {
    const text = buildDigest(emptyData());
    expect(text).not.toContain("CLIMA DE HOY");
    expect(text).not.toContain("FRASE DEL DÍA");
  });

  it("incluye clima y frase cuando se proporcionan", () => {
    const text = buildDigest(
      emptyData({
        weather: {
          description: "Parcialmente nublado",
          temperatureMaxC: 22,
          temperatureMinC: 10,
          precipitationProbabilityMax: 20,
        },
        phrase: "Avanza a tu ritmo, pero avanza.",
      }),
    );
    expect(text).toContain("CLIMA DE HOY");
    expect(text).toContain("Parcialmente nublado · máx 22 °C · mín 10 °C");
    expect(text).toContain("FRASE DEL DÍA");
    expect(text).toContain("Avanza a tu ritmo, pero avanza.");
  });
});

describe("buildDigestEmail (HTML escapado)", () => {
  it("escapa el contenido externo de eventos y correos", () => {
    const email = buildDigestEmail(
      emptyData({
        integrationsAvailable: true,
        events: [
          {
            title: '<script>alert("xss")</script>',
            starts_at: "2026-10-20T09:00:00Z",
            ends_at: null,
            all_day: false,
            location: null,
          },
        ],
        emails: [
          {
            sender_name: null,
            sender_email: "atacante@example.com",
            subject: 'Hola <img src=x onerror="alert(1)">',
            received_at: "2026-10-20T07:00:00Z",
            is_important: true,
          },
        ],
      }),
    );

    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("&lt;img src=x");
  });

  it("genera asunto, texto y html coherentes", () => {
    const email = buildDigestEmail(emptyData());
    expect(email.subject).toBe("Resumen del 20/10/2026");
    expect(email.text.split("\n").length).toBeGreaterThan(5);
    expect(email.html.startsWith("<!doctype html>")).toBe(true);
    expect(email.html).toContain('lang="es"');
  });
});
