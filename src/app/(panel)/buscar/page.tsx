import Link from "next/link";
import { connection } from "next/server";
import { SearchForm } from "@/components/search-section";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { isDemoMode } from "@/lib/config";
import { searchAll, type SearchResult } from "@/lib/data/search";
import { formatDate } from "@/lib/datetime";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Buscar" };
export const instant = false;

const KIND_LABELS: Record<SearchResult["kind"], string> = {
  tarea: "Tarea",
  nota: "Nota",
  evento: "Evento",
  correo: "Correo",
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await connection();
  const query = ((await searchParams).q ?? "").trim();
  const results = query ? await searchAll(query) : [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Buscar
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Encuentra tareas, notas, eventos y asuntos de correo (mínimo 2 letras).
        </p>
      </header>

      <SearchForm initialQuery={query} />

      {query.length > 0 && query.length < 2 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Escribe al menos 2 letras para buscar.
        </p>
      )}

      {query.length >= 2 && (
        <Card title={`Resultados para «${query}»`}>
          {isDemoMode() ? (
            <EmptyState
              title="La búsqueda necesita una cuenta real"
              description="En modo demo no hay datos conectados. Inicia sesión con tu cuenta para buscar."
            />
          ) : results.length === 0 ? (
            <EmptyState
              title="Sin resultados"
              description="Prueba con otras letras o revisa que el dato esté guardado en la app."
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {results.map((result) => (
                <li key={`${result.kind}-${result.id}`} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {KIND_LABELS[result.kind]}
                    </span>
                    {result.date && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(result.date)}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {result.href && result.kind !== "correo" ? (
                      <Link href={result.href} className="hover:underline">
                        {result.title}
                      </Link>
                    ) : result.href ? (
                      <a
                        href={result.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {result.title}
                      </a>
                    ) : (
                      result.title
                    )}
                  </p>
                  {result.detail && (
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                      {result.detail}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
