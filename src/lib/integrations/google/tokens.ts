import { getRefreshToken } from "@/lib/integrations/repository";
import { googleProvider } from "@/lib/integrations/google/provider";

/** Renueva el access token a partir del refresh token almacenado en servidor. */
export async function refreshStoredToken(integrationId: string): Promise<string | null> {
  const stored = await getRefreshToken(integrationId);
  if (!stored) return null;
  const tokens = await googleProvider.refreshAccessToken(stored);
  return tokens.accessToken;
}
