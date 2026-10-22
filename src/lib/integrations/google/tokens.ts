import { getRefreshToken } from "@/lib/integrations/repository";
import {
  GoogleAuthError,
  googleProvider,
} from "@/lib/integrations/google/provider";
import { decryptStoredSecret, hasTokenEncryptionKey } from "@/lib/integrations/crypto";

export type TokenRefreshResult =
  | { ok: true; accessToken: string }
  | {
      ok: false;
      reason:
        | "sin_credencial"
        | "clave_ausente"
        | "credencial_invalida"
        | "error";
    };

/** Renueva el access token a partir del refresh token almacenado y cifrado en servidor. */
export async function refreshStoredToken(
  integrationId: string,
): Promise<TokenRefreshResult> {
  const stored = await getRefreshToken(integrationId);
  if (!stored) return { ok: false, reason: "sin_credencial" };
  if (!hasTokenEncryptionKey()) return { ok: false, reason: "clave_ausente" };

  let refreshToken: string;
  try {
    refreshToken = decryptStoredSecret(stored);
  } catch {
    // Secreto ilegible (clave rota o dato corrupto): forzar reconexión.
    return { ok: false, reason: "credencial_invalida" };
  }

  try {
    const tokens = await googleProvider.refreshAccessToken(refreshToken);
    return { ok: true, accessToken: tokens.accessToken };
  } catch (error) {
    if (error instanceof GoogleAuthError && error.requiresReconnect) {
      return { ok: false, reason: "credencial_invalida" };
    }
    return { ok: false, reason: "error" };
  }
}
