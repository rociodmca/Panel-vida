import { describe, expect, it } from "vitest";
import { phraseOfTheDay } from "@/lib/digest/phrase";

describe("phraseOfTheDay (determinista por fecha)", () => {
  it("devuelve la misma frase para la misma fecha", () => {
    expect(phraseOfTheDay("2026-10-20")).toBe(phraseOfTheDay("2026-10-20"));
  });

  it("es estable de un año al siguiente salvo ciclos", () => {
    const frase = phraseOfTheDay("2026-01-01");
    expect(typeof frase).toBe("string");
    expect(frase.length).toBeGreaterThan(0);
    // 2027-01-01 es un día más: la frase puede cambiar, pero siempre existe.
    expect(phraseOfTheDay("2027-01-01").length).toBeGreaterThan(0);
  });

  it("maneja bisiesto y fin de mes", () => {
    expect(phraseOfTheDay("2028-02-29").length).toBeGreaterThan(0);
    expect(phraseOfTheDay("2026-12-31").length).toBeGreaterThan(0);
  });

  it("cae en una frase distinta para fechas suficientemente separadas", () => {
    // 14 frases en la lista: a ~7 días de distancia la posición cambia.
    expect(phraseOfTheDay("2026-10-20")).not.toBe(phraseOfTheDay("2026-10-27"));
  });

  it("devuelve una frase si la fecha no es válida", () => {
    expect(phraseOfTheDay("no-fecha").length).toBeGreaterThan(0);
  });
});
