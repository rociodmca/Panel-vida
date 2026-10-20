"use client";

import { useActionState, useEffect, useRef } from "react";
import { toggleGymLog, type GymActionState } from "@/app/actions/gym";
import { Button } from "@/components/ui/button";
import type { GymStatus } from "@/lib/data/gym";

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

export function GymTracker({
  status,
  demoMode,
}: {
  status: GymStatus;
  demoMode: boolean;
}) {
  const [state, action, pending] = useActionState(
    async () => toggleGymLog(),
    { logged: status.todayLogged } as GymActionState,
  );

  // Tras un cambio exitoso, revalidamos la página para refrescar racha y semana.
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current) return;
    if (state.logged === undefined) return;
    applied.current = true;
    // La revalidación del server action ya refresca la página;
    // este effect solo evita reintentos duplicados en StrictMode.
  }, [state.logged]);

  const todayLogged = state.logged ?? status.todayLogged;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Racha actual</p>
          <p className="mt-0.5 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {status.streak}
            <span className="ml-1 text-base font-normal text-zinc-500 dark:text-zinc-400">
              {status.streak === 1 ? "día" : "días"}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Esta semana</p>
          <p className="mt-0.5 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {status.weekCount}
            <span className="ml-1 text-base font-normal text-zinc-500 dark:text-zinc-400">
              de 7
            </span>
          </p>
        </div>
      </div>

      <div className="flex gap-1.5" aria-label="Días con entrenamiento esta semana">
        {status.weekDays.map((done, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                done
                  ? "bg-teal-600 dark:bg-teal-400"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
              aria-label={`${DAY_LETTERS[i]}: ${done ? "entrenado" : "sin registrar"}`}
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {DAY_LETTERS[i]}
            </span>
          </div>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {state.error}
        </p>
      )}

      <form action={action}>
        {todayLogged ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-teal-800 dark:text-teal-200">
              Entrenado hoy
            </span>
            <Button variant="ghost" size="sm" type="submit" disabled={pending || demoMode}>
              {pending ? "Quitando…" : "Deshacer"}
            </Button>
          </div>
        ) : (
          <Button type="submit" disabled={pending || demoMode}>
            {pending ? "Registrando…" : "Registrar entrenamiento de hoy"}
          </Button>
        )}
      </form>
      {demoMode && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          En modo demo no hay cuenta real: el registro no se guarda.
        </p>
      )}
    </div>
  );
}
