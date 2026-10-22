import Link from "next/link";
import { connection } from "next/server";
import { LoginForm } from "@/components/login-form";
import { FormSuccess } from "@/components/ui/form";
import { isDemoMode } from "@/lib/config";
import { isGoogleAuthEnabled } from "@/lib/supabase/providers";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Iniciar sesión" };
export const instant = false;

const ERROR_MESSAGES: Record<string, string> = {
  google:
    "El acceso con Google no está disponible: falta activar el proveedor Google en Supabase (Authentication → Providers).",
  supabase: "Supabase no está configurado en este entorno.",
  oauth:
    "No se pudo completar el acceso con Google. Vuelve a intentarlo; si persiste, revisa la URL de redirección en Supabase (Authentication → URL Configuration).",
  access_denied: "Has cancelado el acceso con Google.",
  invalid_request:
    "Supabase ha rechazado la vuelta del acceso con Google. Comprueba que la URL de redirección está permitida en Authentication → URL Configuration.",
  server_error:
    "Google ha devuelto un error al iniciar sesión. Inténtalo de nuevo en unos minutos.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    error_description?: string;
    error_code?: string;
    sesion?: string;
  }>;
}) {
  // El estado del proveedor de Google se consulta en Supabase: la página se
  // resuelve en cada visita, no se prerenderiza.
  await connection();
  const params = await searchParams;
  const errorKey = params.error ?? params.error_code ?? "";
  const errorMessage =
    ERROR_MESSAGES[errorKey] ??
    (errorKey
      ? "No se pudo iniciar sesión. Inténtalo de nuevo."
      : undefined);
  const errorDetail = params.error_description?.slice(0, 200);
  const sessionClosed = params.sesion === "cerrada";
  const googleEnabled = !isDemoMode() && (await isGoogleAuthEnabled());

  if (isDemoMode()) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Iniciar sesión
          </h1>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            Supabase no está configurado en este entorno, así que no hay cuentas
            reales. Puedes explorar el panel con los datos de demostración.
          </p>
          <Link
            href="/hoy"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
          >
            Entrar en modo demostración
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sesión
        </h1>
        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            {errorMessage}
            {errorDetail && (
              <span className="mt-1 block text-xs opacity-80">{errorDetail}</span>
            )}
          </p>
        )}
        {sessionClosed && (
          <FormSuccess message="Has cerrado la sesión correctamente." />
        )}
        <LoginForm googleEnabled={googleEnabled} />
      </div>
    </main>
  );
}
