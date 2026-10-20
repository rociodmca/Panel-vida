import { getRefreshToken } from "@/lib/integrations/repository";
import { googleProvider } from "@/lib/integrations/google/provider";
import { decryptStoredSecret, hasTokenEncryptionKey } from "@/lib/integrations/crypto";

/** Renueva el access token a partir del refresh token almacenado y cifrado en servidor. */
export async function refreshStoredToken(integrationId: string): Promise<string | null> {
  const stored = await getRefreshToken(integrationId);
  if (!stored || !hasTokenEncryptionKey()) return null;
  let refreshToken: string;
  try {
    refreshToken = decryptStoredSecret(stored);
  } catch {
    // Secreto ilegible (clave rota o dato corrupto): forzar reconexión.
    return null;
  }
  const tokens = await googleProvider.refreshAccessToken(refreshToken);
  return tokens.accessToken;
}
