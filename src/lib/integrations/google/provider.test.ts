import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.GOOGLE_CLIENT_ID = "cliente-prueba.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "secreto-prueba";
});

import {
  GMAIL_READ_SCOPES,
  GMAIL_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
  GOOGLE_SCOPES,
  GoogleAuthError,
  googleProvider,
  parseGoogleTarget,
  scopeLabel,
  scopesForTarget,
} from "./provider";

const REDIRECT_URI = "https://panel.example/api/integrations/google/callback";

describe("selección de scopes", () => {
  it("acepta solo objetivos conocidos y cae en agenda por defecto", () => {
    expect(parseGoogleTarget("gmail")).toBe("gmail");
    expect(parseGoogleTarget("ambos")).toBe("ambos");
    expect(parseGoogleTarget("google_calendar")).toBe("google_calendar");
    expect(parseGoogleTarget("otro")).toBe("google_calendar");
    expect(parseGoogleTarget(null)).toBe("google_calendar");
  });

  it("pide agenda y correo juntos con una sola autorización", () => {
    expect(scopesForTarget("ambos")).toEqual(GOOGLE_SCOPES);
    expect(GOOGLE_SCOPES).toEqual([...GOOGLE_CALENDAR_SCOPES, ...GMAIL_SCOPES]);
  });

  it("separa los scopes por proveedor (consentimiento incremental)", () => {
    expect(scopesForTarget("gmail")).toEqual(GMAIL_SCOPES);
    expect(scopesForTarget("google_calendar")).toEqual(GOOGLE_CALENDAR_SCOPES);
  });

  it("usa solo scopes de lectura de Gmail (sin envío ni modificación)", () => {
    expect(GMAIL_SCOPES).toEqual(["https://www.googleapis.com/auth/gmail.readonly"]);
    expect(GMAIL_SCOPES.some((scope) => scope.includes("gmail.modify"))).toBe(false);
    expect(GMAIL_SCOPES.some((scope) => scope.includes("mail.google.com"))).toBe(false);
  });

  it("acepta conexiones antiguas con gmail.metadata", () => {
    expect(GMAIL_READ_SCOPES).toContain("https://www.googleapis.com/auth/gmail.readonly");
    expect(GMAIL_READ_SCOPES).toContain("https://www.googleapis.com/auth/gmail.metadata");
  });

  it("traduce los scopes a etiquetas legibles", () => {
    expect(scopeLabel(GOOGLE_CALENDAR_SCOPES[0])).toBe("Agenda (solo lectura)");
    expect(scopeLabel(GMAIL_SCOPES[0])).toBe("Correo (lectura)");
  });
});

describe("URL de autorización", () => {
  it("incluye PKCE, state, acceso offline y consentimento", () => {
    const url = new URL(
      googleProvider.buildAuthUrl(REDIRECT_URI, "state-123", GOOGLE_SCOPES, "challenge"),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(REDIRECT_URI);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(GOOGLE_SCOPES);
  });
});

describe("intercambio de credenciales", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("devuelve access token, refresh token y scopes concedidos", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 3600,
          scope: GOOGLE_SCOPES.join(" "),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tokens = await googleProvider.exchangeCode("code-1", REDIRECT_URI, "verifier");

    expect(tokens.accessToken).toBe("access-1");
    expect(tokens.refreshToken).toBe("refresh-1");
    expect(tokens.scope).toBe(GOOGLE_SCOPES.join(" "));
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBe("verifier");
    expect(body.get("redirect_uri")).toBe(REDIRECT_URI);
  });

  it("propaga el código de error de Google (invalid_grant)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "invalid_grant",
            error_description: "Bad Request",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const error = await googleProvider
      .exchangeCode("code-1", REDIRECT_URI, "verifier")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GoogleAuthError);
    expect((error as GoogleAuthError).code).toBe("invalid_grant");
    expect((error as GoogleAuthError).requiresReconnect).toBe(true);
  });

  it("detecta credenciales caducadas al renovar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await googleProvider
      .refreshAccessToken("refresh-1")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GoogleAuthError);
    expect((error as GoogleAuthError).requiresReconnect).toBe(true);
  });

  it("no filtra el secreto del cliente en los errores", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "invalid_client" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await googleProvider
      .refreshAccessToken("refresh-1")
      .catch((e: unknown) => e);

    expect(String(error)).not.toContain(process.env.GOOGLE_CLIENT_SECRET ?? "");
  });
});
