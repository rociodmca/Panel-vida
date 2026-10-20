import { TasksSection } from "@/components/tasks-section";
import { Card } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tareas" };
export const instant = false;

export default function TareasPage() {
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
      </header>
      <Card>
        <TasksSection />
      </Card>
    </div>
  );
}
