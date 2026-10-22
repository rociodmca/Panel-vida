import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemoMode } from "@/lib/config";

const PROTECTED = ["/hoy", "/agenda", "/tareas", "/ajustes"];
const OAUTH_CALLBACK = "/auth/callback";

function isProtected(pathname: string): boolean {
  return PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Protege las rutas del panel. En modo demo (sin Supabase configurado)
 * se permite el acceso para que la experiencia sea evaluable sin credenciales.
 * La validación real de sesión y de propiedad ocurre también en el layout
 * de cada sección y con RLS en base de datos.
 */
export async function proxy(request: NextRequest) {
  if (isDemoMode()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const code = request.nextUrl.searchParams.get("code");

  // El proveedor vuelve con el código PKCE en la URL de destino. Se lleva a la
  // ruta de callback, que lo canjea por la sesión y deja la cookie httpOnly.
  if (code && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = OAUTH_CALLBACK;
    url.search = "";
    url.searchParams.set("code", code);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!isProtected(pathname)) {
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
