import Link from "next/link";
import { connection } from "next/server";
import { NotesSection } from "@/components/notes-section";
import { TasksSection } from "@/components/tasks-section";
import { Card } from "@/components/ui/card";
import { isDemoMode } from "@/lib/config";
import { getRecentNotes } from "@/lib/data/notes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tareas" };
export const instant = false;

export default async function TareasPage() {
  await connection();
  const notes = await getRecentNotes(10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Tareas
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Crea, edita, completa, reabre y archiva. Usa «Añadir tarea» para la
          captura rápida desde cualquier pantalla.
        </p>
        <nav aria-label="Atajos" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link
            href="/buscar"
            className="font-medium text-teal-800 underline hover:text-teal-900 dark:text-teal-200"
          >
            Buscar en todo
          </Link>
          <Link
            href="/enfoque"
            className="font-medium text-teal-800 underline hover:text-teal-900 dark:text-teal-200"
          >
            Modo enfoque
          </Link>
        </nav>
      </header>
      <Card>
        <TasksSection />
      </Card>
      <Card
        title="Notas rápidas"
        description="Ideas, recordatorios y pensamientos sueltos. La primera línea será el título."
      >
        <NotesSection notes={notes} demoMode={isDemoMode()} />
      </Card>
    </div>
  );
}
