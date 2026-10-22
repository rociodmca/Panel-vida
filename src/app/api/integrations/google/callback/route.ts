import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_REDIRECT_URI, isGoogleConfigured } from "@/lib/config";
import {
  encryptSecret,
  hasTokenEncryptionKey,
} from "@/lib/integrations/crypto";
import {
  GMAIL_READ_SCOPES,
  GOOGLE_CALENDAR_SCOPES,
  googleProvider,
  parseGoogleTarget,
  scopesForTarget,
  type GoogleTarget,
} from "@/lib/integrations/google/provider";
import {
  disconnectIntegration,
  upsertIntegration,
  type ProviderName,
} from "@/lib/integrations/repository";
import { syncCalendar, syncGmail } from "@/lib/integrations/sync";
import { getAdminStatus, type AdminStatus } from "@/lib/supabase/health";
import { cookies } from "next/headers";

/**
 * Callback OAuth de Google.
 * Valida state + PKCE, intercambia el código y guarda las conexiones
 * concedidas (agenda, correo o ambas) con los tokens cifrados en servidor.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/ajustes?aviso=oauth_no_configurado", request.url),
    );
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state")?.value;
  const userId = cookieStore.get("oauth_user")?.value;
  const target = parseGoogleTarget(cookieStore.get("oauth_target")?.value ?? null);
  const codeVerifier = cookieStore.get("oauth_pkce_verifier")?.value;

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const fail = (detalle: string) =>
    NextResponse.redirect(
      new URL(`/ajustes?aviso=oauth_fallido&detalle=${detalle}`, request.url),
    );

  if (oauthError) return fail("denegado");
  if (!code || !state || !expectedState || state !== expectedState) return fail("state");
  if (!codeVerifier) return fail("pkce");
  if (!userId) return fail("sesion");
  if (!hasTokenEncryptionKey()) return fail("config_clave_cifrado");

  // Sin clave de servicio válida no se pueden escribir los tokens cifrados.
  const adminStatus = await getAdminStatus();
  if (adminStatus !== "ok") {
    return fail(adminFailureDetail(adminStatus));
  }

  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_user");
  cookieStore.delete("oauth_target");
  cookieStore.delete("oauth_pkce_verifier");

  try {
    const tokens = await googleProvider.exchangeCode(
      code,
      GOOGLE_REDIRECT_URI,
      codeVerifier,
    );
    const profile = await googleProvider.fetchProfile(tokens.accessToken);

    const scopes = tokens.scope?.split(" ").filter(Boolean) ?? [];
    const effectiveScopes = scopes.length ? scopes : scopesForTarget(target);
    const providers = providersForScopes(effectiveScopes, target);

    const encryptedRefreshToken = tokens.refreshToken
      ? encryptSecret(tokens.refreshToken)
      : "";

    const integrationIds = new Map<ProviderName, string>();
    for (const provider of providers) {
      const result = await upsertIntegration({
        userId,
        provider,
        providerAccountId: profile.providerAccountId,
        scopes: scopesForProvider(provider, effectiveScopes),
        encryptedRefreshToken,
      });
      if (result.error || !result.id) {
        // Sin credencial utilizable no dejamos una conexión a medias.
        if (result.id) await disconnectIntegration(userId, result.id);
        return fail(result.error === "sin_refresh_token" ? "sin_refresco" : "guardado");
      }
      integrationIds.set(provider, result.id);
    }

    for (const [provider, integrationId] of integrationIds) {
      if (provider === "gmail") {
        await syncGmail(userId, integrationId, tokens.accessToken);
      } else {
        await syncCalendar(userId, integrationId, tokens.accessToken);
      }
    }

    const aviso = providers.length > 1 ? "conectado" : "conectado_parcial";
    return NextResponse.redirect(new URL(`/ajustes?aviso=${aviso}`, request.url));
  } catch {
    return fail("token");
  }
}

/** Motivo legible del fallo de infraestructura de Supabase. */
function adminFailureDetail(status: AdminStatus): string {
  if (status === "sin_configurar") return "admin_no_configurado";
  if (status === "invalido") return "admin_invalido";
  if (status === "sin_esquema") return "admin_sin_esquema";
  return "admin_error_servidor";
}

/** Qué conexiones se crean según los scopes realmente concedidos. */
function providersForScopes(scopes: string[], target: GoogleTarget): ProviderName[] {
  const providers: ProviderName[] = [];
  if (scopes.some((scope) => GOOGLE_CALENDAR_SCOPES.includes(scope))) {
    providers.push("google_calendar");
  }
  if (scopes.some((scope) => GMAIL_READ_SCOPES.includes(scope))) {
    providers.push("gmail");
  }
  if (providers.length > 0) return providers;
  return [target === "gmail" ? "gmail" : "google_calendar"];
}

/** Cada conexión guarda solo los scopes que usa, para explicarlos bien. */
function scopesForProvider(provider: ProviderName, scopes: string[]): string[] {
  const wanted = scopesForTarget(provider === "gmail" ? "gmail" : "google_calendar");
  const propios = scopes.filter((scope) => wanted.includes(scope));
  return propios.length ? propios : scopes;
}
