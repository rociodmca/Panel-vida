import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/config", () => ({
  SUPABASE_URL: "https://proyecto.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  isDemoMode: () => false,
}));

const getUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}));

const BASE = "https://panel-vida-pearl.vercel.app";

async function call(path: string) {
  const { proxy } = await import("@/proxy");
  const { NextRequest } = await import("next/server");
  return proxy(new NextRequest(`${BASE}${path}`));
}

describe("proxy: traspaso del código OAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  });

  it("lleva el código a la ruta de callback y conserva el destino", async () => {
    const res = await call("/hoy?code=codigo-pkce");
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("code")).toBe("codigo-pkce");
    expect(location.searchParams.get("next")).toBe("/hoy");
  });

  it("no toca las rutas sin código", async () => {
    const res = await call("/hoy");
    expect(res.headers.get("location")).toBeNull();
  });

  it("no desvía rutas que no son del panel", async () => {
    const res = await call("/buscar?code=codigo-pkce");
    expect(res.headers.get("location")).toBeNull();
  });

  it("sigue admitiendo las rutas del panel con sesión", async () => {
    const res = await call("/hoy");
    expect(res.headers.get("location")).toBeNull();
  });

  it("traslada a la raíz los errores del proveedor", async () => {
    const res = await call("/?error=invalid_request&error_description=prueba");
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("invalid_request");
    expect(location.searchParams.get("error_description")).toBe("prueba");
  });

  it("deja pasar la raíz sin errores", async () => {
    const res = await call("/");
    expect(res.headers.get("location")).toBeNull();
  });

  it("lleva a la callback el código que llega en la raíz", async () => {
    const res = await call("/?code=codigo-pkce");
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("code")).toBe("codigo-pkce");
    expect(location.searchParams.get("next")).toBe("/hoy");
  });
});
