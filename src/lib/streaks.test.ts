import { describe, expect, it } from "vitest";
import { computeStreak, shiftDayKey } from "@/lib/streaks";

describe("shiftDayKey", () => {
  it("desplaza hacia adelante y hacia atrás", () => {
    expect(shiftDayKey("2026-10-20", 1)).toBe("2026-10-21");
    expect(shiftDayKey("2026-10-20", -1)).toBe("2026-10-19");
  });

  it("cruza meses y años", () => {
    expect(shiftDayKey("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("cruza años bisiestos", () => {
    expect(shiftDayKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(shiftDayKey("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("computeStreak", () => {
  const today = "2026-10-20";

  it("cuenta la racha que termina hoy", () => {
    const dates = new Set(["2026-10-20", "2026-10-19", "2026-10-18"]);
    expect(computeStreak(dates, today)).toBe(3);
  });

  it("cuenta desde ayer si hoy no está registrado", () => {
    const dates = new Set(["2026-10-19", "2026-10-18"]);
    expect(computeStreak(dates, today)).toBe(2);
  });

  it("devuelve 0 sin registros cercanos", () => {
    expect(computeStreak(new Set<string>(), today)).toBe(0);
    expect(computeStreak(new Set(["2026-10-10"]), today)).toBe(0);
  });

  it("se corta en un hueco", () => {
    const dates = new Set(["2026-10-20", "2026-10-18"]);
    expect(computeStreak(dates, today)).toBe(1);
  });
});
