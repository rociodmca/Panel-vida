import { describe, expect, it, vi } from "vitest";
import {
  computePkceChallenge,
  decryptSecret,
  decryptStoredSecret,
  encryptSecret,
  generatePkceVerifier,
  hasTokenEncryptionKey,
} from "./crypto";

vi.hoisted(() => {
  process.env.TOKEN_ENCRYPTION_KEY = Buffer.from(
    Array.from({ length: 32 }, (_, i) => (i * 7) % 256),
  ).toString("base64");
});

describe("cifrado de tokens (AES-256-GCM)", () => {
  it("detecta que la clave está configurada", () => {
    expect(hasTokenEncryptionKey()).toBe(true);
  });

  it("cifra y descifra un refresh token conservando caracteres especiales", () => {
    const original = "1//0gRefreshTokenÑñ€ con espacios y :dos puntos:";
    const stored = encryptSecret(original);
    expect(stored.startsWith("v1:")).toBe(true);
    expect(stored).not.toContain(original);
    expect(decryptSecret(stored)).toBe(original);
  });

  it("genera un cifrado distinto cada vez (IV aleatorio)", () => {
    const a = encryptSecret("mismo valor");
    const b = encryptSecret("mismo valor");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it("falla ante manipulación del ciphertext (autenticación GCM)", () => {
    const stored = encryptSecret("secreto");
    const parts = stored.split(":");
    const tampered = parts[3].slice(0, -2) + "AA";
    expect(() => decryptSecret([parts[0], parts[1], parts[2], tampered].join(":"))).toThrow();
  });

  it("rechaza formatos desconocidos", () => {
    expect(() => decryptSecret("plaintext-sin-formato")).toThrow();
    expect(() => decryptSecret("v2:a:b:c")).toThrow();
    expect(() => decryptSecret("v1:solo:tres:partes")).toThrow();
  });

  it("decryptStoredSecret pasa valores legados sin cifrar sin romper", () => {
    expect(decryptStoredSecret("token-legado")).toBe("token-legado");
    const original = "nuevo-formato";
    expect(decryptStoredSecret(encryptSecret(original))).toBe(original);
  });
});

describe("PKCE (RFC 7636)", () => {
  it("reproduce el vector de prueba oficial del challenge S256", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(computePkceChallenge(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("genera verifiers únicos de longitud válida (43-128 caracteres)", () => {
    const a = generatePkceVerifier();
    const b = generatePkceVerifier();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a.length).toBeLessThanOrEqual(128);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
