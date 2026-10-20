import { connection } from "next/server";
import { HabitsTracker } from "@/components/habits-tracker";
import { JournalForm, SleepForm } from "@/components/wellness-section";
import { Card } from "@/components/ui/card";
import { isDemoMode } from "@/lib/config";
import { getHabitsStatus } from "@/lib/data/habits";
import { getWellnessToday } from "@/lib/data/wellness";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bienestar" };
export const instant = false;

export default async function BienestarPage() {
  await connection();
  const [habits, wellness] = await Promise.all([
    getHabitsStatus(),
    getWellnessToday(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Bienestar
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Hábitos diarios, sueño, energía y micro-diario. Son datos sensibles:
          solo tú puedes verlos y puedes borrarlos desde Ajustes.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Hábitos"
          description="Máximo 6 activos. La racha se mantiene solo si no pierdes días."
        >
          <HabitsTracker status={habits} demoMode={isDemoMode()} manage />
        </Card>

        <Card
          title="Sueño y energía"
          description="Horas de sueño de la noche anterior y energía al despertar (1 a 5)."
        >
          <SleepForm today={wellness} demoMode={isDemoMode()} />
        </Card>
      </div>

      <Card
        title="Micro-diario"
        description="Tres gratitudes y una reflexión breve para cerrar el día."
      >
        <JournalForm today={wellness} demoMode={isDemoMode()} />
      </Card>
    </div>
  );
}
