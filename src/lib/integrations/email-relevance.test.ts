import { describe, expect, it } from "vitest";
import { computeRelevance } from "./email-relevance";

const NOW = new Date("2026-03-10T09:00:00.000Z");

describe("relevancia del correo", () => {
  it("prioriza lo marcado como importante", () => {
    const relevance = computeRelevance({
      isUnread: true,
      isImportant: true,
      receivedAt: "2026-03-09T08:00:00.000Z",
      now: NOW,
    });
    expect(relevance.code).toBe("importante");
    expect(relevance.score).toBe(1);
    expect(relevance.label).toBe("Marcado como importante");
  });

  it("sitúa lo no leído por debajo de lo importante", () => {
    const relevance = computeRelevance({
      isUnread: true,
      isImportant: false,
      receivedAt: "2026-03-09T08:00:00.000Z",
      now: NOW,
    });
    expect(relevance.code).toBe("no_leido");
    expect(relevance.score).toBeGreaterThan(0.5);
  });

  it("marca como reciente lo recibido en las últimas 24 horas", () => {
    const relevance = computeRelevance({
      isUnread: false,
      isImportant: false,
      receivedAt: "2026-03-10T01:00:00.000Z",
      now: NOW,
    });
    expect(relevance.code).toBe("reciente");
  });

  it("deja el resto como informativo", () => {
    const relevance = computeRelevance({
      isUnread: false,
      isImportant: false,
      receivedAt: "2026-03-01T01:00:00.000Z",
      now: NOW,
    });
    expect(relevance.code).toBe("informativo");
    expect(relevance.score).toBeLessThan(0.2);
  });

  it("no falla con fechas inválidas", () => {
    const relevance = computeRelevance({
      isUnread: false,
      isImportant: false,
      receivedAt: "no-es-una-fecha",
      now: NOW,
    });
    expect(relevance.code).toBe("informativo");
  });
});
