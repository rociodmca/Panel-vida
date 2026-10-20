import { NextResponse, type NextRequest } from "next/server";
import {
  APP_URL,
  isDemoMode,
  isGoogleConfigured,
} from "@/lib/config";
import {
  GOOGLE_CALENDAR_SCOPES,
  GMAIL_SCOPES,
  googleProvider,
} from "@/lib/integrations/google/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const CALLBACK_URL = `${APP_URL}/api/integrations/google/callback`;

/**
 * Inicia el flujo OAuth de Google (server-side flow).
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

  const target = request.nextUrl.searchParams.get("target") ?? "google_calendar";
  const scopes =
    target === "gmail"
      ? GMAIL_SCOPES
      : target === "ambos"
        ? [...GOOGLE_CALENDAR_SCOPES, ...GMAIL_SCOPES]
        : GOOGLE_CALENDAR_SCOPES;

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("oauth_user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("oauth_target", target, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  const url = googleProvider.buildAuthUrl(CALLBACK_URL, state, scopes);
  return NextResponse.redirect(url);
}
