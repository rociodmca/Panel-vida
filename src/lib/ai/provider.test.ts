import { describe, expect, it, vi, afterEach } from "vitest";
import { OpenAiCompatibleProvider } from "@/lib/ai/provider";

function jsonResponse(content: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

function errorResponse(status: number) {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

describe("OpenAiCompatibleProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve el contenido del modelo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse('{"resumen":"hola"}'));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(
      "clave",
      "gemini-2.5-flash",
      "https://ejemplo.test/v1",
      5000,
    );
    const out = await provider.complete("resume esto", "sistema");

    expect(out).toBe('{"resumen":"hola"}');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("gemini-2.5-flash");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0]).toEqual({ role: "system", content: "sistema" });
  });

  it("reintenta sin modo JSON si el proveedor lo rechaza", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(400))
      .mockResolvedValueOnce(jsonResponse('{"resumen":"ok"}'));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(
      "clave",
      "modelo",
      "https://ejemplo.test/v1",
      5000,
    );
    const out = await provider.complete("resume", "sistema");

    expect(out).toBe('{"resumen":"ok"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(retryBody.response_format).toBeUndefined();
    expect(retryBody.temperature).toBeUndefined();
    expect(retryBody.reasoning_effort).toBeUndefined();
  });

  it("añade reasoning_effort cuando está configurado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse("{}"));
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(
      "clave",
      "gemini-2.5-flash",
      "https://ejemplo.test/v1",
      5000,
      { jsonMode: true, reasoningEffort: "none" },
    );
    await provider.complete("resume", "sistema");

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.reasoning_effort).toBe("none");
  });

  it("devuelve null si el proveedor responde con un error de servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(500)));

    const provider = new OpenAiCompatibleProvider(
      "clave",
      "modelo",
      "https://ejemplo.test/v1",
      5000,
    );
    expect(await provider.complete("resume", "sistema")).toBeNull();
  });

  it("devuelve null si la red falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("sin red")),
    );

    const provider = new OpenAiCompatibleProvider(
      "clave",
      "modelo",
      "https://ejemplo.test/v1",
      5000,
    );
    expect(await provider.complete("resume", "sistema")).toBeNull();
  });

  it("no supera el presupuesto de tiempo total", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("abortado")));
          }),
      ),
    );

    const provider = new OpenAiCompatibleProvider(
      "clave",
      "modelo",
      "https://ejemplo.test/v1",
      60,
    );
    const inicio = Date.now();
    expect(await provider.complete("resume", "sistema")).toBeNull();
    expect(Date.now() - inicio).toBeLessThan(2000);
  });
});
