import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatTime,
  greetingForHour,
  isOverdue,
  localDayKey,
  localTimeKey,
} from "@/lib/datetime";

describe("localDayKey (zona horaria y DST)", () => {
  it("usa el día local de Madrid, no el de UTC", () => {
    // 01/01 a las 23:30 UTC ya es 02/01 en Madrid (UTC+1)
    expect(localDayKey(new Date("2026-01-01T23:30:00Z"))).toBe("2026-01-02");
  });

  it("cambia de hora de verano sin desplazar el día", () => {
    // 29/03/2026: salto CET→CEST a las 02:00 locales
    expect(localDayKey(new Date("2026-03-29T00:30:00Z"))).toBe("2026-03-29");
    expect(localDayKey(new Date("2026-03-29T02:30:00Z"))).toBe("2026-03-29");
  });

  it("cambia de hora de invierno sin duplicar el día", () => {
    // 25/10/2026: vuelta CEST→CET a las 03:00 locales
    expect(localDayKey(new Date("2026-10-24T23:30:00Z"))).toBe("2026-10-25");
    expect(localDayKey(new Date("2026-10-25T12:00:00Z"))).toBe("2026-10-25");
  });
});

describe("localTimeKey (hora local)", () => {
  it("refleja el salto de primavera: 01:30 UTC pasa a ser 03:30 locales", () => {
    expect(localTimeKey(new Date("2026-03-29T00:30:00Z"))).toBe("01:30");
    expect(localTimeKey(new Date("2026-03-29T01:30:00Z"))).toBe("03:30");
  });

  it("refleja la vuelta al invierno: 01:30 UTC es 02:30 locales", () => {
    expect(localTimeKey(new Date("2026-10-25T01:30:00Z"))).toBe("02:30");
  });
});

describe("formateo", () => {
  it("formatea la fecha en español con la zona local", () => {
    expect(formatDate(new Date("2026-10-20T09:00:00Z"))).toBe("20/10/2026");
  });

  it("formatea la hora en 24 h locales", () => {
    expect(formatTime(new Date("2026-06-15T09:05:00Z"))).toBe("11:05");
  });
});

describe("saludo", () => {
  it("cambia en los límites 14 h y 21 h", () => {
    expect(greetingForHour(9)).toBe("Buenos días");
    expect(greetingForHour(13)).toBe("Buenos días");
    expect(greetingForHour(14)).toBe("Buenas tardes");
    expect(greetingForHour(20)).toBe("Buenas tardes");
    expect(greetingForHour(21)).toBe("Buenas noches");
    expect(greetingForHour(23)).toBe("Buenas noches");
  });
});

describe("isOverdue", () => {
  it("no marca vencidas completadas o archivadas", () => {
    const past = "2020-01-01T00:00:00Z";
    expect(isOverdue(past, "pendiente")).toBe(true);
    expect(isOverdue(past, "completada")).toBe(false);
    expect(isOverdue(past, "archivada")).toBe(false);
    expect(isOverdue(null, "pendiente")).toBe(false);
  });

  it("no marca vencida una tarea futura", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isOverdue(future, "pendiente")).toBe(false);
  });
});
