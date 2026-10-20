"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHabit, removeHabit, toggleHabit } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { MAX_ACTIVE_HABITS, type HabitsStatus } from "@/lib/types";

export function HabitsTracker({
  status,
  demoMode,
  manage = false,
}: {
  status: HabitsStatus;
  demoMode: boolean;
  /** true = vista de gestión (añadir/eliminar) en /bienestar. */
  manage?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (status.habits.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Sin hábitos todavía"
          description={
            manage
              ? "Añade hasta 6 hábitos para seguir tu racha diaria, como meditar, leer o beber agua."
              : "Puedes crear hasta 6 hábitos en la página Bienestar."
          }
        />
        {manage && (
          <HabitForm
            value={newName}
            onChange={setNewName}
            onSubmit={() => {
              const name = newName;
              setNewName("");
              run(() => addHabit(name));
            }}
            disabled={isPending || demoMode}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-1">
        {status.habits.map((habit) => (
          <li
            key={habit.id}
            className="flex items-center gap-3 rounded-lg px-1 py-1.5"
          >
            <button
              type="button"
              aria-pressed={habit.doneToday}
              disabled={isPending || demoMode}
              onClick={() => run(() => toggleHabit(habit.id))}
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-50 ${
                habit.doneToday
                  ? "border-teal-700 bg-teal-700 text-white dark:border-teal-400 dark:bg-teal-500"
                  : "border-zinc-300 bg-white text-transparent hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-950"
              }`}
              aria-label={`${habit.doneToday ? "Deshacer" : "Marcar"} ${habit.name}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                habit.doneToday
                  ? "text-zinc-500 line-through dark:text-zinc-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {habit.name}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {habit.streak > 0
                ? `racha ${habit.streak} ${habit.streak === 1 ? "día" : "días"}`
                : "sin racha"}
            </span>
            {manage && (
              <button
                type="button"
                disabled={isPending || demoMode}
                onClick={() => run(() => removeHabit(habit.id))}
                aria-label={`Eliminar ${habit.name}`}
                className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:hover:bg-zinc-800 dark:hover:text-red-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      {manage && status.activeCount < MAX_ACTIVE_HABITS && (
        <HabitForm
          value={newName}
          onChange={setNewName}
          onSubmit={() => {
            const name = newName;
            setNewName("");
            run(() => addHabit(name));
          }}
          disabled={isPending || demoMode}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {demoMode && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          En modo demo no hay cuenta real: los cambios no se guardan.
        </p>
      )}
    </div>
  );
}

function HabitForm({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onSubmit();
      }}
      className="flex items-center gap-2"
    >
      <Input
        id="habit-name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="p. ej. Meditar 10 minutos"
        maxLength={60}
        disabled={disabled}
        aria-label="Nombre del hábito"
      />
      <Button type="submit" size="sm" disabled={disabled || !value.trim()}>
        Añadir
      </Button>
    </form>
  );
}
