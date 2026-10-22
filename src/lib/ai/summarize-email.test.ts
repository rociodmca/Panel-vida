import { describe, expect, it } from "vitest";
import {
  buildSummaryPrompt,
  deterministicSummary,
  parseAiSummary,
  summarizeEmail,
} from "./summarize-email";
import type { AiProvider } from "./types";

const correo = {
  subject: "Revisión de la póliza antes del viernes",
  from: "Ana <ana@seguros.example>",
  body: [
    "Hola,",
    "",
    "Necesito que revises la póliza 2024-118 antes del viernes.",
    "Adjunto el documento con el detalle de las coberturas.",
    "",
    "Gracias,",
    "Ana",
  ].join("\n"),
};

function providerThatAnswers(raw: string): AiProvider {
  return {
    name: "prueba",
    async complete() {
      return raw;
    },
  };
}

describe("validación de la respuesta del modelo", () => {
  it("acepta un JSON válido y normaliza los campos", () => {
    const parsed = parseAiSummary(
      JSON.stringify({
        resumen: "Pide revisar la póliza antes del viernes.",
        puntos: ["Documento adjunto", "Vence el viernes", "Extra", "Más", "Exceso", "Otro"],
        requiere_accion: true,
        tareas: ["Revisar la póliza"],
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed?.fuente).toBe("ia");
    expect(parsed?.puntos).toHaveLength(5);
    expect(parsed?.requiere_accion).toBe(true);
  });

  it("acepta la respuesta envuelta en un bloque de código", () => {
    const parsed = parseAiSummary(
      '```json\n{"resumen":"Texto","puntos":[],"requiere_accion":false,"tareas":[]}\n```',
    );
    expect(parsed?.resumen).toBe("Texto");
  });

  it("rechaza JSON inválido o sin resumen", () => {
    expect(parseAiSummary("no es json")).toBeNull();
    expect(parseAiSummary('{"puntos":["a"]}')).toBeNull();
  });

  it("extrae el JSON si el proveedor añade texto alrededor", () => {
    const parsed = parseAiSummary(
      'Aquí tienes el resumen:\n{"resumen":"Texto","puntos":[],"requiere_accion":false,"tareas":[]}\nEspero que te sirva.',
    );
    expect(parsed?.resumen).toBe("Texto");
    expect(parsed?.fuente).toBe("ia");
  });

  it("ignora campos que no son texto", () => {
    const parsed = parseAiSummary(
      '{"resumen":"Bien","puntos":["uno",2,null],"tareas":[3],"requiere_accion":"sí"}',
    );
    expect(parsed?.puntos).toEqual(["uno"]);
    expect(parsed?.tareas).toEqual([]);
    expect(parsed?.requiere_accion).toBe(false);
  });
});

describe("resumen determinista", () => {
  it("extrae un resumen y detecta que pide acción", () => {
    const resumen = deterministicSummary(correo);
    expect(resumen.fuente).toBe("determinista");
    expect(resumen.resumen.length).toBeGreaterThan(0);
    expect(resumen.requiere_accion).toBe(true);
  });

  it("no inventa tareas si el correo no pide nada", () => {
    const resumen = deterministicSummary({
      subject: "Boletín",
      from: "noticias@example.com",
      body: "Solo noticias de la semana. Nada que hacer.",
    });
    expect(resumen.requiere_accion).toBe(false);
    expect(resumen.tareas).toHaveLength(0);
  });
});

describe("orquestación", () => {
  it("usa el proveedor cuando está permitido y responde bien", async () => {
    const resumen = await summarizeEmail(correo, {
      aiEnabled: true,
      provider: providerThatAnswers(
        '{"resumen":"Resumen de la IA","puntos":["uno"],"requiere_accion":true,"tareas":["tarea"]}',
      ),
    });
    expect(resumen.fuente).toBe("ia");
    expect(resumen.resumen).toBe("Resumen de la IA");
  });

  it("cae al resumen determinista si el proveedor falla", async () => {
    const resumen = await summarizeEmail(correo, {
      aiEnabled: true,
      provider: providerThatAnswers("texto sin json"),
    });
    expect(resumen.fuente).toBe("determinista");
  });

  it("no llama al proveedor si la IA está desactivada", async () => {
    let llamado = false;
    const provider: AiProvider = {
      name: "prueba",
      async complete() {
        llamado = true;
        return '{"resumen":"No debería aparecer"}';
      },
    };
    const resumen = await summarizeEmail(correo, { aiEnabled: false, provider });
    expect(llamado).toBe(false);
    expect(resumen.fuente).toBe("determinista");
  });

  it("manda el correo como dato delimitado, no como instrucción", () => {
    const prompt = buildSummaryPrompt(correo);
    expect(prompt).toContain("<correo>");
    expect(prompt).toContain("</correo>");
    expect(prompt).toContain(correo.subject);
  });
});
