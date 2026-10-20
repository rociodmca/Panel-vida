import { DIGEST_WEATHER_LAT, DIGEST_WEATHER_LON } from "@/lib/config";

export interface DigestWeather {
  description: string;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationProbabilityMax: number;
}

/** Códigos meteorológicos WMO → descripción en español (España). */
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Despejado",
  1: "Mayormente despejado",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Niebla",
  48: "Niebla con escarcha",
  51: "Llovizna ligera",
  53: "Llovizna",
  55: "Llovizna intensa",
  56: "Llovizna helada",
  57: "Llovizna helada intensa",
  61: "Lluvia ligera",
  63: "Lluvia",
  65: "Lluvia intensa",
  66: "Lluvia helada",
  67: "Lluvia helada intensa",
  71: "Nieve ligera",
  73: "Nieve",
  75: "Nieve intensa",
  77: "Granos de nieve",
  80: "Chubascos ligeros",
  81: "Chubascos",
  82: "Chubascos intensos",
  85: "Chubascos de nieve",
  86: "Chubascos de nieve intensos",
  95: "Tormenta",
  96: "Tormenta con granizo",
  99: "Tormenta con granizo intenso",
};

export function weatherDescriptionEs(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "Cielo variable";
}

export interface OpenMeteoDailyResponse {
  daily?: {
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

/** Extrae el clima de hoy de la respuesta diaria de Open-Meteo; null si falta dato. */
export function parseOpenMeteoDaily(json: OpenMeteoDailyResponse): DigestWeather | null {
  const daily = json.daily;
  const code = daily?.weather_code?.[0];
  const tMax = daily?.temperature_2m_max?.[0];
  const tMin = daily?.temperature_2m_min?.[0];
  if (typeof code !== "number" || typeof tMax !== "number" || typeof tMin !== "number") {
    return null;
  }
  const precipitation = daily?.precipitation_probability_max?.[0];
  return {
    description: weatherDescriptionEs(code),
    temperatureMaxC: Math.round(tMax),
    temperatureMinC: Math.round(tMin),
    precipitationProbabilityMax: typeof precipitation === "number" ? Math.round(precipitation) : 0,
  };
}

export function formatWeatherLine(weather: DigestWeather): string {
  const lluvia =
    weather.precipitationProbabilityMax >= 50
      ? ` · ${weather.precipitationProbabilityMax}% de probabilidad de lluvia`
      : "";
  return `${weather.description} · máx ${weather.temperatureMaxC} °C · mín ${weather.temperatureMinC} °C${lluvia}`;
}

/**
 * Clima de hoy vía Open-Meteo (sin API key, coordenadas configurables).
 * Devuelve null si falla la red o la respuesta: el digest sigue sin clima.
 */
export async function fetchTodayWeather(): Promise<DigestWeather | null> {
  const params = new URLSearchParams({
    latitude: DIGEST_WEATHER_LAT,
    longitude: DIGEST_WEATHER_LON,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Europe/Madrid",
    forecast_days: "1",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return parseOpenMeteoDaily((await response.json()) as OpenMeteoDailyResponse);
  } catch {
    return null;
  }
}
