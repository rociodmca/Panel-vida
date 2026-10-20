import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { TOKEN_ENCRYPTION_KEY } from "@/lib/config";

const VERSION_PREFIX = "v1";
const IV_LENGTH = 12;

function getKey(): Buffer {
  if (!TOKEN_ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY no configurada");
  }
  const key = Buffer.from(TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY debe ser una clave AES de 32 bytes en base64");
  }
  return key;
}

export function hasTokenEncryptionKey(): boolean {
  if (!TOKEN_ENCRYPTION_KEY) return false;
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cifra un secreto (AES-256-GCM autenticado) con un prefijo versionado
 * para poder rotar la estrategia en el futuro: `v1:<iv>:<tag>:<ciphertext>`.
 * Nunca lanza el secreto en los mensajes de error.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/** Descifra un secreto producido por `encryptSecret`. Formato no reconocido → error. */
export function decryptSecret(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
    throw new Error("Formato de secreto cifrado no reconocido");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** Si el valor está cifrado con formato `v1:` lo descifra; si no (dato legado), lo devuelve tal cual. */
export function decryptStoredSecret(stored: string): string {
  return stored.startsWith(`${VERSION_PREFIX}:`) ? decryptSecret(stored) : stored;
}

/** Genera un `code_verifier` de 64 caracteres para PKCE (RFC 7636). */
export function generatePkceVerifier(): string {
  return randomBytes(48).toString("base64url");
}

/** Deriva el `code_challenge` S256 a partir del verifier. */
export function computePkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
