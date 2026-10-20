/** Frases motivacionales breves en español (España). Lista fija del servidor. */
const PHRASES = [
  "El mejor momento para empezar es ahora.",
  "Un pequeño paso cada día lleva lejos.",
  "Lo hecho, hecho está; lo por hacer, está en tus manos.",
  "La constancia vence al talento cuando el talento no es constante.",
  "Hoy cuenta tanto como mañana.",
  "Avanza a tu ritmo, pero avanza.",
  "Lo importante es no parar de avanzar.",
  "Cada día es una nueva oportunidad para mejorar.",
  "La disciplina es la puerta entre las metas y los logros.",
  "Menos prisa, más presencia.",
  "Empieza por lo difícil; el resto fluye.",
  "Descansa hoy para rendir mejor mañana.",
  "Haz hoy lo que tu yo del futuro te agradecerá.",
  "La claridad llega al trabajar, no al esperar.",
];

/**
 * Frase determinista del día a partir de la fecha local (YYYY-MM-DD).
 * Misma fecha → misma frase; sin aleatoriedad ni dependencias externas.
 */
export function phraseOfTheDay(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return PHRASES[0]!;
  const dayOfYear = Math.round(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86_400_000,
  );
  return PHRASES[dayOfYear % PHRASES.length]!;
}
