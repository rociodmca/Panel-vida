import { FocusTimer } from "@/components/focus-timer";
import { Card } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enfoque" };
export const instant = false;

export default function EnfoquePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Enfoque
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pomodoro sencillo: 25 minutos de enfoque y 5 de descanso. Elige una
          tarea y empieza.
        </p>
      </header>
      <Card>
        <FocusTimer />
      </Card>
    </div>
  );
}
