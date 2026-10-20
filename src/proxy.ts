import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemoMode } from "@/lib/config";

const PROTECTED = ["/hoy", "/agenda", "/tareas", "/ajustes"];

/**
 * Protege las rutas del panel. En modo demo (sin Supabase configurado)
 * se permite el acceso para que la experiencia sea evaluable sin credenciales.
 * La validación real de sesión y de propiedad ocurre también en el layout
 * de cada sección y con RLS en base de datos.
 */
export async function proxy(request: NextRequest) {
  if (isDemoMode()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // En proxy no se escriben cookies desde aquí.
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/hoy/:path*", "/agenda/:path*", "/tareas/:path*", "/ajustes/:path*"],
};
