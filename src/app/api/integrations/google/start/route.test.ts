import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Verificación del inicio del flujo OAuth de Google (Authorization Code + PKCE).
 * Se simulan las cookies y la sesión de Supabase: no se hacen llamadas de red.
 */

const cookieStore = new Map<string, unknown>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => ({ name: n, value: String(cookieStore.get(n) ?? "") }),
    set: (n: string, v: unknown) => void cookieStore.set(n, v),
    delete: (n: string) => void cookieStore.delete(n),
  }),
}));

vi.mock("@/lib/config", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    GOOGLE_CLIENT_ID: "123.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "secret-de-prueba",
    GOOGLE_REDIRECT_URI: "http://localhost:3000/api/integrations/google/callback",
    isGoogleConfigured: () => true,
    isDemoMode: () => false,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: "11111111-2222-3333-4444-555555555555" } },
      }),
    },
  }),
}));

const USER_ID = "11111111-2222-3333-4444-555555555555";

async function startOAuth(target?: string) {
  const { GET } = await import("@/app/api/integrations/google/start/route");
  const { NextRequest } = await import("next/server");
  const url = target
    ? `http://localhost:3000/api/integrations/google/start?target=${target}`
    : "http://localhost:3000/api/integrations/google/start";
  const res = await GET(new NextRequest(url));
  return res;
}

describe("inicio del flujo OAuth de Google", () => {
  beforeEach(() => {
    cookieStore.clear();
  });

  it("redirige a Google con PKCE, state, scopes de solo lectura y cookies de un solo uso", async () => {
    const res = await startOAuth("ambos");
    const location = res.headers.get("location") ?? "";

    expect(res.status).toBe(307);
    expect(location.startsWith("https://accounts.google.com/o/oauth2/v2/auth")).toBe(true);

    const u = new URL(location);
    expect(u.searchParams.get("client_id")).toBe("123.apps.googleusercontent.com");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/integrations/google/callback",
    );
    expect(u.searchParams.get("access_type")).toBe("offline");
    expect(u.searchParams.get("prompt")).toBe("consent");
    expect(u.searchParams.get("include_granted_scopes")).toBe("true");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")?.length).toBeGreaterThan(40);

    const scopes = (u.searchParams.get("scope") ?? "").split(" ");
    expect(scopes).toContain("https://www.googleapis.com/auth/calendar.readonly");
    expect(scopes).toContain("https://www.googleapis.com/auth/gmail.readonly");
    expect(scopes.some((s) => /gmail\.(modify|send)|calendar\.events|mail\.google/.test(s))).toBe(
      false,
    );

    const state = u.searchParams.get("state") ?? "";
    expect(state).toMatch(/^[0-9a-f-]{36}$/);

    expect(String(cookieStore.get("oauth_state"))).toBe(state);
    expect(String(cookieStore.get("oauth_user"))).toBe(USER_ID);
    expect(String(cookieStore.get("oauth_target"))).toBe("ambos");
    expect(String(cookieStore.get("oauth_pkce_verifier"))?.length).toBeGreaterThan(40);
  });

  it("pide solo scopes de calendario por defecto", async () => {
    const res = await startOAuth();
    const scopes = (new URL(res.headers.get("location") ?? "").searchParams.get("scope") ?? "").split(
      " ",
    );
    expect(scopes).toEqual(["https://www.googleapis.com/auth/calendar.readonly"]);
  });

  it("pide solo scopes de Gmail cuando el objetivo es gmail", async () => {
    const res = await startOAuth("gmail");
    const scopes = (new URL(res.headers.get("location") ?? "").searchParams.get("scope") ?? "").split(
      " ",
    );
    expect(scopes).toEqual(["https://www.googleapis.com/auth/gmail.readonly"]);
  });
});
