import Link from "next/link";
import { RegisterForm } from "@/components/register-form";
import { isDemoMode } from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Registro" };

export default function RegistroPage() {
  if (isDemoMode()) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Crear cuenta
          </h1>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            El registro real necesita Supabase. Configura las variables del
            entorno (ver README) para crear cuentas.
          </p>
          <Link
            href="/hoy"
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
          >
            Explorar la demostración
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Crear cuenta
        </h1>
        <RegisterForm />
      </div>
    </main>
  );
}
