import { describe, expect, it } from "vitest";
import { isDigestWindowOpen, shouldSendDigest, weekdayIndex } from "@/lib/digest/schedule";

describe("weekdayIndex (ISO 1 = lunes … 7 = domingo)", () => {
  it("devuelve el día en Europe/Madrid, no en UTC", () => {
    expect(weekdayIndex(new Date("2026-10-20T12:00:00Z"))).toBe(2); // martes
    expect(weekdayIndex(new Date("2026-10-26T12:00:00Z"))).toBe(1); // lunes
  });

  it("incluye el domingo como 7", () => {
    expect(weekdayIndex(new Date("2026-10-25T12:00:00Z"))).toBe(7);
  });

  it("respeta el cambio de día justo antes de medianoche local", () => {
    // 20/10 a las 23:30 UTC ya es miércoles 21 en Madrid
    expect(weekdayIndex(new Date("2026-10-20T23:30:00Z"))).toBe(3);
  });
});

describe("isDigestWindowOpen", () => {
  it("abre cuando la hora local ya llegó", () => {
    expect(isDigestWindowOpen("08:00", "07:00")).toBe(true);
    expect(isDigestWindowOpen("07:00", "07:00")).toBe(true);
    expect(isDigestWindowOpen("09:15", "09:00")).toBe(true);
  });

  it("sigue cerrada antes de la hora configurada", () => {
    expect(isDigestWindowOpen("06:59", "07:00")).toBe(false);
    expect(isDigestWindowOpen("08:00", "09:00")).toBe(false);
  });

  it("descarta claves inválidas en lugar de enviar a ciegas", () => {
    expect(isDigestWindowOpen("xx:yy", "07:00")).toBe(false);
    expect(isDigestWindowOpen("08:00", "no-valida")).toBe(false);
  });
});

describe("shouldSendDigest", () => {
  const base = {
    currentTimeKey: "08:00",
    digestLocalTime: "07:00",
    digestDays: [1, 2, 3, 4, 5],
  };

  it("envía de lunes a viernes cuando llegó la hora", () => {
    for (const weekday of [1, 2, 3, 4, 5]) {
      expect(shouldSendDigest({ ...base, weekday })).toBe(true);
    }
  });

  it("no envía fin de semana si no está configurado", () => {
    expect(shouldSendDigest({ ...base, weekday: 6 })).toBe(false);
    expect(shouldSendDigest({ ...base, weekday: 7 })).toBe(false);
  });

  it("no envía antes de la hora aunque sea día hábil", () => {
    expect(shouldSendDigest({ ...base, currentTimeKey: "06:30", weekday: 3 })).toBe(false);
  });

  it("no envía si el usuario desactivó todos los días", () => {
    expect(shouldSendDigest({ ...base, digestDays: [], weekday: 3 })).toBe(false);
  });
});
