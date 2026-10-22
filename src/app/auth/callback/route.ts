import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Callback del acceso con Google (vía Supabase).
 *
 * Supabase devuelve el código PKCE en `?code=`. Canjearlo por una sesión es lo
 * que escribe la cookie httpOnly con la que el panel reconoce al usuario:
 * sin este paso el proveedor autoriza, pero la app no inicia sesión y vuelve
 * al formulario de acceso.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, request.nextUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}

/** Solo rutas internas: evita redirigir fuera del sitio. */
function safeNext(value: string | null): string {
  if (!value) return "/hoy";
  if (!value.startsWith("/")) return "/hoy";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/hoy";
  return value;
}
