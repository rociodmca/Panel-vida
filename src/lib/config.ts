const env = process.env;

export const APP_URL =
  env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const CRON_SECRET = env.CRON_SECRET ?? "";

export const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID ?? "";
export const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET ?? "";

/**
 * URI de redirección OAuth registrada en Google Cloud Console.
 * Se puede fijar con GOOGLE_REDIRECT_URI; por defecto se deriva de APP_URL.
 * Debe coincidir carácter a carácter con la registrada en Google.
 */
export const GOOGLE_REDIRECT_URI =
  env.GOOGLE_REDIRECT_URI?.trim() ||
  `${APP_URL}/api/integrations/google/callback`;

/**
 * Scopes extra que se piden al iniciar sesión con Google mediante Supabase.
 * Vacío por defecto: el login solo autentica.
 * Con `https://www.googleapis.com/auth/gmail.readonly` el token de proveedor
 * de la sesión también puede leer el correo (además de la conexión propia).
 */
export const GOOGLE_LOGIN_EXTRA_SCOPES = (
  env.GOOGLE_LOGIN_EXTRA_SCOPES ?? ""
)
  .split(/[\s,]+/)
  .map((scope) => scope.trim())
  .filter(Boolean);

// Cifrado AES-256-GCM de tokens OAuth en reposo (solo servidor).
// Base64 de exactamente 32 bytes. Genera una con: openssl rand -base64 32
export const TOKEN_ENCRYPTION_KEY = env.TOKEN_ENCRYPTION_KEY ?? "";

export const EMAIL_PROVIDER = env.EMAIL_PROVIDER ?? "log";
export const EMAIL_API_KEY = env.EMAIL_API_KEY ?? "";
export const EMAIL_FROM = env.EMAIL_FROM ?? "";

// Proveedor de IA en la nube (interfaz compatible con chat completions).
// Sin clave, la app usa el resumen determinista y sigue funcionando.
export const AI_PROVIDER_API_KEY = env.AI_PROVIDER_API_KEY ?? "";
export const AI_PROVIDER_MODEL = env.AI_PROVIDER_MODEL ?? "";
export const AI_PROVIDER_BASE_URL = (
  env.AI_PROVIDER_BASE_URL ?? "https://api.openai.com/v1"
).replace(/\/$/, "");
export const AI_PROVIDER_TIMEOUT_MS = Number(env.AI_PROVIDER_TIMEOUT_MS ?? 20000);
// `response_format: json_object` no lo admiten todos los proveedores: si se
// rechaza, el adaptador reintenta con una petición mínima.
export const AI_PROVIDER_JSON_MODE = env.AI_PROVIDER_JSON_MODE !== "false";
// `none` desactiva el razonamiento interno (modelos tipo Gemini 2.5).
export const AI_PROVIDER_REASONING_EFFORT = (
  env.AI_PROVIDER_REASONING_EFFORT ?? ""
).trim();
// Modelo alternativo si el principal responde 429/5xx (sobrecarga).
export const AI_PROVIDER_FALLBACK_MODEL = (
  env.AI_PROVIDER_FALLBACK_MODEL ?? ""
).trim();

// Coordenadas del clima en el resumen matinal (por defecto: Madrid).
export const DIGEST_WEATHER_LAT = env.DIGEST_WEATHER_LAT ?? "40.4168";
export const DIGEST_WEATHER_LON = env.DIGEST_WEATHER_LON ?? "-3.7038";

export const DEFAULT_TIMEZONE = "Europe/Madrid";
export const DEFAULT_LOCALE = "es-ES";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}
