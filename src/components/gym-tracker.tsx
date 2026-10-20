"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addGymSet, deleteGymSet, toggleGymLog, type GymActionState } from "@/app/actions/gym";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import type { GymSet, GymStatus } from "@/lib/types";

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

export function GymTracker({
  status,
  sets,
  demoMode,
}: {
  status: GymStatus;
  sets: GymSet[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async () => toggleGymLog(),
    { logged: status.todayLogged } as GymActionState,
  );
  const [showSets, setShowSets] = useState(false);
  const [exercise, setExercise] = useState("");
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [setError, setSetError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayLogged = state.logged ?? status.todayLogged;

  function handleAddSet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSetError(null);
    const parsedReps = Number(reps);
    const parsedWeight = weight.trim() === "" ? null : Number(weight);
    startTransition(async () => {
      const result = await addGymSet({
        exercise,
        reps: parsedReps,
        weightKg: parsedWeight,
      });
      if (result.error) {
        setSetError(result.error);
        return;
      }
      setExercise("");
      setReps("");
      setWeight("");
      router.refresh();
    });
  }

  function handleDeleteSet(id: string) {
    setSetError(null);
    startTransition(async () => {
      const result = await deleteGymSet(id);
      if (result.error) setSetError(result.error);
      else router.refresh();
    });
  }

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

      {todayLogged && (
        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowSets((v) => !v)}
            aria-expanded={showSets}
            className="flex w-full items-center justify-between text-sm font-medium text-zinc-800 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:text-zinc-200 dark:hover:text-zinc-50"
          >
            Series de hoy ({sets.length})
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
              className={`transition-transform ${showSets ? "rotate-180" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {showSets && (
            <div className="mt-3 space-y-3">
              {setError && (
                <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                  {setError}
                </p>
              )}
              {sets.length > 0 && (
                <ul className="space-y-1">
                  {sets.map((set) => (
                    <li
                      key={set.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-2.5 py-1.5 text-sm dark:bg-zinc-800/60"
                    >
                      <span className="min-w-0 truncate text-zinc-800 dark:text-zinc-200">
                        {set.exercise}
                        <span className="ml-2 tabular-nums text-zinc-600 dark:text-zinc-400">
                          {set.reps} ×{" "}
                          {set.weight_kg !== null ? `${set.weight_kg} kg` : "—"}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={isPending || demoMode}
                        onClick={() => handleDeleteSet(set.id)}
                        aria-label={`Eliminar serie ${set.exercise}`}
                        className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:hover:bg-zinc-700 dark:hover:text-red-300"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddSet} className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <label className="col-span-3 sm:col-span-1">
                    <span className="sr-only">Ejercicio</span>
                    <Input
                      value={exercise}
                      onChange={(e) => setExercise(e.target.value)}
                      placeholder="Ejercicio"
                      maxLength={120}
                      required
                      disabled={isPending || demoMode}
                      aria-label="Ejercicio"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Repeticiones</span>
                    <Input
                      type="number"
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                      placeholder="Reps"
                      min={1}
                      max={500}
                      required
                      disabled={isPending || demoMode}
                      aria-label="Repeticiones"
                    />
                  </label>
                  <label>
                    <span className="sr-only">Peso en kg (opcional)</span>
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="Peso (kg)"
                      min={0}
                      max={500}
                      step={0.5}
                      disabled={isPending || demoMode}
                      aria-label="Peso en kilogramos (opcional)"
                    />
                  </label>
                </div>
                <Button type="submit" size="sm" disabled={isPending || demoMode}>
                  {isPending ? "Añadiendo…" : "Añadir serie"}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {demoMode && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          En modo demo no hay cuenta real: el registro no se guarda.
        </p>
      )}
    </div>
  );
}
