import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "@/lib/config";
import type { ConnectedAccount, OAuthTokens, ProviderAdapter } from "@/lib/integrations/types";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

export const GMAIL_SCOPES = [
  // Lectura del correo (metadatos y cuerpo). Sin envío, sin modificación,
  // sin etiquetas: gmail.modify y mail.google.com quedan fuera del MVP.
  "https://www.googleapis.com/auth/gmail.readonly",
];

/** Scopes conjuntos: una sola autorización da acceso a agenda y correo. */
export const GOOGLE_SCOPES = [...GOOGLE_CALENDAR_SCOPES, ...GMAIL_SCOPES];

/**
 * Scopes que permiten leer correo. `gmail.readonly` incluye los metadatos,
 * así que una conexión antigua con `gmail.metadata` sigue siendo válida.
 */
export const GMAIL_READ_SCOPES = [
  ...GMAIL_SCOPES,
  "https://www.googleapis.com/auth/gmail.metadata",
];

/** Qué se pide consentir en cada caso. */
export type GoogleTarget = "google_calendar" | "gmail" | "ambos";

export const GOOGLE_TARGETS: GoogleTarget[] = ["google_calendar", "gmail", "ambos"];

export function parseGoogleTarget(value: string | null): GoogleTarget {
  return (GOOGLE_TARGETS as string[]).includes(value ?? "")
    ? (value as GoogleTarget)
    : "google_calendar";
}

export function scopesForTarget(target: GoogleTarget): string[] {
  if (target === "gmail") return [...GMAIL_SCOPES];
  if (target === "ambos") return [...GOOGLE_SCOPES];
  return [...GOOGLE_CALENDAR_SCOPES];
}

/** Etiqueta legible de un scope, para explicarlo en la interfaz. */
export function scopeLabel(scope: string): string {
  if (scope.includes("calendar.readonly")) return "Agenda (solo lectura)";
  if (scope.includes("gmail.readonly")) return "Correo (lectura)";
  if (scope.includes("gmail.metadata")) return "Correo (metadatos)";
  return scope;
}

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * Error de la API de Google con su código (p. ej. `invalid_grant`), para poder
 * diferenciar "credencial caducada" de "fallo puntual" sin filtrar secretos.
 */
export class GoogleAuthError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 0) {
    super(message);
    this.name = "GoogleAuthError";
    this.code = code;
    this.status = status;
  }

  /** La credencial ya no es válida: hay que volver a autorizar. */
  get requiresReconnect(): boolean {
    return this.code === "invalid_grant" || this.code === "invalid_token";
  }
}

function ensureConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new GoogleAuthError(
      "no_configurado",
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados",
    );
  }
}

async function readOAuthError(response: Response): Promise<GoogleAuthError> {
  let code = `http_${response.status}`;
  let description = "";
  try {
    const body = (await response.json()) as {
      error?: string;
      error_description?: string;
    };
    if (body.error) code = body.error;
    if (body.error_description) description = body.error_description;
  } catch {
    // Respuesta sin JSON: nos quedamos con el código HTTP.
  }
  return new GoogleAuthError(code, description || `Error de Google (${response.status})`, response.status);
}

export const googleProvider: ProviderAdapter = {
  name: "google",

  buildAuthUrl(redirectUri, state, scopes, codeChallenge) {
    ensureConfigured();
    const url = new URL(AUTH_ENDPOINT);
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
    // offline + consent: Google entrega refresh token y lo hace extensible.
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    return url.toString();
  },

  async exchangeCode(code, redirectUri, codeVerifier): Promise<OAuthTokens> {
    ensureConfigured();
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
      }),
    });
    if (!response.ok) throw await readOAuthError(response);
    const body = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
      scope: body.scope,
    };
  },

  async refreshAccessToken(refreshToken): Promise<OAuthTokens> {
    ensureConfigured();
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) throw await readOAuthError(response);
    const body = (await response.json()) as {
      access_token: string;
      expires_in?: number;
      scope?: string;
    };
    return {
      accessToken: body.access_token,
      refreshToken,
      expiresAt: body.expires_in ? Date.now() + body.expires_in * 1000 : undefined,
      scope: body.scope,
    };
  },

  async fetchProfile(accessToken): Promise<ConnectedAccount> {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw await readOAuthError(response);
    const body = (await response.json()) as { id: string; email?: string };
    return { providerAccountId: body.id, email: body.email };
  },

  async revoke(token) {
    try {
      await fetch(REVOKE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    } catch {
      // La revocación remota es best-effort; el borrado local manda.
    }
  },
};
