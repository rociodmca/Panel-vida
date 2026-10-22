import { describe, expect, it, vi, beforeEach } from "vitest";

const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { exchangeCodeForSession },
  }),
}));

const BASE = "https://panel-vida-pearl.vercel.app/auth/callback";

async function call(query: string) {
  const { GET } = await import("@/app/auth/callback/route");
  const { NextRequest } = await import("next/server");
  return GET(new NextRequest(`${BASE}${query}`));
}

describe("callback OAuth: canje del código por sesión", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
  });

  it("canjea el código y entra al panel", async () => {
    const res = await call("?code=codigo-pkce");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("codigo-pkce");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://panel-vida-pearl.vercel.app/hoy");
  });

  it("vuelve a la ruta interna solicitada", async () => {
    const res = await call("?code=codigo-pkce&next=%2Fagenda");
    expect(res.headers.get("location")).toBe(
      "https://panel-vida-pearl.vercel.app/agenda",
    );
  });

  it("ignora destinos externos", async () => {
    const res = await call("?code=codigo-pkce&next=https%3A%2F%2Fevil.example.com");
    expect(res.headers.get("location")).toBe("https://panel-vida-pearl.vercel.app/hoy");
  });

  it("vuelve al acceso si no hay código", async () => {
    const res = await call("");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "https://panel-vida-pearl.vercel.app/login?error=oauth",
    );
  });

  it("vuelve al acceso si Supabase rechaza el código", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { message: "invalid" },
    } as never);
    const res = await call("?code=invalido");
    expect(res.headers.get("location")).toBe(
      "https://panel-vida-pearl.vercel.app/login?error=oauth",
    );
  });
});
