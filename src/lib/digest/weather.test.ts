import { describe, expect, it } from "vitest";
import {
  formatWeatherLine,
  parseOpenMeteoDaily,
  weatherDescriptionEs,
} from "@/lib/digest/weather";

describe("weatherDescriptionEs (códigos WMO)", () => {
  it("traduce códigos conocidos", () => {
    expect(weatherDescriptionEs(0)).toBe("Despejado");
    expect(weatherDescriptionEs(3)).toBe("Nublado");
    expect(weatherDescriptionEs(63)).toBe("Lluvia");
    expect(weatherDescriptionEs(95)).toBe("Tormenta");
  });

  it("usa un texto genérico para códigos desconocidos", () => {
    expect(weatherDescriptionEs(42)).toBe("Cielo variable");
  });
});

describe("parseOpenMeteoDaily", () => {
  const daily = {
    weather_code: [3],
    temperature_2m_max: [21.4],
    temperature_2m_min: [11.6],
    precipitation_probability_max: [62.3],
  };

  it("extrae y redondea los valores del día", () => {
    const weather = parseOpenMeteoDaily({ daily });
    expect(weather).toEqual({
      description: "Nublado",
      temperatureMaxC: 21,
      temperatureMinC: 12,
      precipitationProbabilityMax: 62,
    });
  });

  it("devuelve null si faltan temperaturas", () => {
    expect(parseOpenMeteoDaily({ daily: { weather_code: [1] } })).toBeNull();
    expect(parseOpenMeteoDaily({})).toBeNull();
  });

  it("acepta respuesta sin probabilidad de lluvia", () => {
    const weather = parseOpenMeteoDaily({
      daily: { weather_code: [0], temperature_2m_max: [30], temperature_2m_min: [15] },
    });
    expect(weather?.precipitationProbabilityMax).toBe(0);
  });
});

describe("formatWeatherLine", () => {
  it("incluye la probabilidad de lluvia solo si es alta", () => {
    expect(
      formatWeatherLine({
        description: "Lluvia",
        temperatureMaxC: 18,
        temperatureMinC: 9,
        precipitationProbabilityMax: 70,
      }),
    ).toBe("Lluvia · máx 18 °C · mín 9 °C · 70% de probabilidad de lluvia");

    expect(
      formatWeatherLine({
        description: "Despejado",
        temperatureMaxC: 28,
        temperatureMinC: 14,
        precipitationProbabilityMax: 10,
      }),
    ).toBe("Despejado · máx 28 °C · mín 14 °C");
  });
});
