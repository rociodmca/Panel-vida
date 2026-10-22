import { describe, expect, it, vi, beforeEach } from "vitest";

const signOut = vi.fn(async () => ({ error: null }));
const setAll = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
    getAll: () => [],
    setAll,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { signOut },
  }),
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect }));

async function runLogout() {
  const { logout } = await import("@/app/actions/auth");
  await logout();
}

describe("acción logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signOut.mockResolvedValue({ error: null } as never);
  });

  it("cierra la sesión en Supabase", async () => {
    await expect(runLogout()).rejects.toThrow("NEXT_REDIRECT");
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("redirige al login con el aviso de sesión cerrada", async () => {
    await expect(runLogout()).rejects.toThrow("NEXT_REDIRECT:/login?sesion=cerrada");
    expect(redirect).toHaveBeenCalledWith("/login?sesion=cerrada");
  });

  it("revisa la caché antes de redirigir", async () => {
    await expect(runLogout()).rejects.toThrow("NEXT_REDIRECT");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
