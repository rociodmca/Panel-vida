import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "@/lib/config";
import type { ConnectedAccount, OAuthTokens, ProviderAdapter } from "@/lib/integrations/types";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

export const GMAIL_SCOPES = [
  // Solo metadatos: remitente, asunto, fecha y etiquetas. Sin cuerpos ni adjuntos.
  "https://www.googleapis.com/auth/gmail.metadata",
];

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

function ensureConfigured() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET no configurados");
  }
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
    if (!response.ok) throw new Error(`Intercambio de código fallido (${response.status})`);
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
    if (!response.ok) throw new Error(`Renovación de token fallida (${response.status})`);
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
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Perfil de Google fallido (${response.status})`);
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
