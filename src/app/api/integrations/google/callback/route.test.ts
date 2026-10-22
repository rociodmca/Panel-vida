import { describe, expect, it, vi, beforeEach } from "vitest";

const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (cookieStore.has(n) ? { name: n, value: cookieStore.get(n)! } : undefined),
    set: (n: string, v: unknown) => void cookieStore.set(n, String(v)),
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
  };
});

const BASE = "http://localhost:3000/api/integrations/google/callback";

async function call(query: string) {
  const { GET } = await import("@/app/api/integrations/google/callback/route");
  const { NextRequest } = await import("next/server");
  const res = await GET(new NextRequest(`${BASE}${query}`));
  return res.headers.get("location") ?? "";
}

function detalle(location: string) {
  return new URL(location).searchParams.get("detalle") ?? "";
}

describe("callback OAuth Google: controles de seguridad", () => {
  beforeEach(() => {
    cookieStore.clear();
    cookieStore.set("oauth_state", "state-esperado");
    cookieStore.set("oauth_user", "11111111-2222-3333-4444-555555555555");
    cookieStore.set("oauth_target", "ambos");
    cookieStore.set("oauth_pkce_verifier", "verificador-pkce-de-prueba");
  });

  it("rechaza un state que no coincide", async () => {
    expect(detalle(await call("?code=abc&state=state-falso"))).toBe("state");
  });

  it("rechaza la ausencia de code o state", async () => {
    expect(detalle(await call("?state=state-esperado"))).toBe("state");
    expect(detalle(await call("?code=abc"))).toBe("state");
    expect(detalle(await call(""))).toBe("state");
  });

  it("rechaza un state vacío o ausente en la cookie", async () => {
    cookieStore.delete("oauth_state");
    expect(detalle(await call("?code=abc&state=state-esperado"))).toBe("state");
  });

  it("rechaza la ausencia del verificador PKCE", async () => {
    cookieStore.delete("oauth_pkce_verifier");
    expect(detalle(await call("?code=abc&state=state-esperado"))).toBe("pkce");
  });

  it("rechaza la ausencia del usuario de sesión", async () => {
    cookieStore.delete("oauth_user");
    expect(detalle(await call("?code=abc&state=state-esperado"))).toBe("sesion");
  });

  it("registra el denial de Google como denegado", async () => {
    expect(detalle(await call("?error=access_denied&state=state-esperado"))).toBe("denegado");
  });

  it("nunca filtra el secret de Google en una URL de error", async () => {
    const location = await call("?code=abc&state=state-falso");
    expect(location).not.toContain("secret-de-prueba");
    expect(location).not.toContain("123.apps.googleusercontent.com");
  });
});
