import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Página no encontrada
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        La dirección a la que has llegado no existe en el panel.
      </p>
      <Link
        href="/hoy"
        className="mt-2 inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800"
      >
        Ir a Hoy
      </Link>
    </main>
  );
}
