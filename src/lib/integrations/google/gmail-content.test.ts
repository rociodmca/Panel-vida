import { describe, expect, it } from "vitest";
import {
  decodeBase64Url,
  extractTextBody,
  htmlToText,
  prepareBodyForPrompt,
  stripQuotedReply,
  truncateForPrompt,
} from "./gmail-content";

const b64 = (value: string) => Buffer.from(value, "utf8").toString("base64url");

describe("decodificación", () => {
  it("decodifica base64url con y sin relleno", () => {
    expect(decodeBase64Url(b64("Hola"))).toBe("Hola");
    expect(decodeBase64Url("SG9sYQ")).toBe("Hola");
  });

  it("devuelve texto vacío si el dato no es válido", () => {
    expect(decodeBase64Url("%%%")).toBe("");
  });
});

describe("HTML a texto", () => {
  it("quita etiquetas y conserva los saltos", () => {
    const html = "<div>Hola<p>Segunda línea</p><br>Third</div>";
    expect(htmlToText(html)).toContain("Hola");
    expect(htmlToText(html)).toContain("Segunda línea");
    expect(htmlToText(html)).not.toContain("<div>");
  });

  it("elimina scripts y estilos", () => {
    const html = "<style>p{color:red}</style><script>alert(1)</script><p>Texto</p>";
    const text = htmlToText(html);
    expect(text).not.toContain("alert(1)");
    expect(text).not.toContain("color:red");
    expect(text).toContain("Texto");
  });

  it("decodifica entidades básicas", () => {
    expect(htmlToText("M&aacute;s&nbsp;ma&ntilde;ana")).toContain("Más mañana");
  });
});

describe("extracción del cuerpo", () => {
  it("prefiere text/plain sobre text/html", () => {
    const body = extractTextBody({
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: b64("Versión texto") } },
        { mimeType: "text/html", body: { data: b64("<p>Versión html</p>") } },
      ],
    });
    expect(body.text).toContain("Versión texto");
    expect(body.usedHtml).toBe(false);
  });

  it("convierte a texto cuando solo hay HTML", () => {
    const body = extractTextBody({
      mimeType: "text/html",
      body: { data: b64("<p>Solo <b>html</b></p>") },
    });
    expect(body.text).toContain("Solo html");
    expect(body.usedHtml).toBe(true);
  });

  it("detecta adjuntos por el nombre de archivo", () => {
    const body = extractTextBody({
      parts: [
        { mimeType: "text/plain", body: { data: b64("Mira el PDF") } },
        {
          mimeType: "application/pdf",
          filename: "factura.pdf",
          body: { data: b64("...") },
        },
      ],
    });
    expect(body.hasAttachments).toBe(true);
    expect(body.text).toContain("Mira el PDF");
  });

  it("no rompe con un payload vacío", () => {
    expect(extractTextBody(undefined).text).toBe("");
  });
});

describe("limpieza del texto", () => {
  it("corta la respuesta citada", () => {
    const text = [
      "Buenos días, te escribo por la cita.",
      "",
      "El 12 de mayo a las 10:00.",
      "",
      "> Escribió tal cual:",
      "> Hola, ¿nos vemos mañana?",
    ].join("\n");
    const limpio = stripQuotedReply(text);
    expect(limpio).toContain("Buenos días");
    expect(limpio).not.toContain("Escribió tal cual");
  });

  it("corta con el marcador de mensaje original", () => {
    const text = "Contenido propio\n\n-----Original Message-----\nDesde: otro@x.com";
    expect(stripQuotedReply(text)).toContain("Contenido propio");
    expect(stripQuotedReply(text)).not.toContain("Original Message");
  });

  it("recorta sin partir palabras y añade puntos suspensivos", () => {
    const texto = "palabra ".repeat(200);
    const corto = truncateForPrompt(texto, 100);
    expect(corto.length).toBeLessThanOrEqual(101);
    expect(corto.endsWith("…")).toBe(true);
  });

  it("prepara el cuerpo quitando cita y recortando", () => {
    const cuerpo = ["Frase útil del mensaje.", "> cita", "otra cita"].join("\n");
    const preparado = prepareBodyForPrompt(cuerpo);
    expect(preparado).toContain("Frase útil");
    expect(preparado).not.toContain("cita");
  });
});
