import { NextResponse, type NextRequest } from "next/server";
import {
  GOOGLE_REDIRECT_URI,
  isDemoMode,
  isGoogleConfigured,
} from "@/lib/config";
import {
  computePkceChallenge,
  generatePkceVerifier,
} from "@/lib/integrations/crypto";
import {
  googleProvider,
  parseGoogleTarget,
  scopesForTarget,
} from "@/lib/integrations/google/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

/**
 * Inicia el flujo OAuth de Google (server-side flow con PKCE).
 * ?target=google_calendar | gmail | ambos
 */
export async function GET(request: NextRequest) {
  if (isDemoMode() || !isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/ajustes?aviso=oauth_no_configurado", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase!.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const target = parseGoogleTarget(request.nextUrl.searchParams.get("target"));
  const scopes = scopesForTarget(target);

  const state = crypto.randomUUID();
  const codeVerifier = generatePkceVerifier();
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  };
  cookieStore.set("oauth_state", state, cookieOptions);
  cookieStore.set("oauth_user", user.id, cookieOptions);
  cookieStore.set("oauth_target", target, cookieOptions);
  cookieStore.set("oauth_pkce_verifier", codeVerifier, cookieOptions);

  const url = googleProvider.buildAuthUrl(
    GOOGLE_REDIRECT_URI,
    state,
    scopes,
    computePkceChallenge(codeVerifier),
  );
  return NextResponse.redirect(url);
}
