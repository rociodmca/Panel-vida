"use client";

import { useActionState } from "react";
import { saveJournalEntry, saveSleepLog } from "@/app/actions/wellness";
import { Button } from "@/components/ui/button";
import { Field, FormError, FormSuccess, Input, Textarea } from "@/components/ui/form";
import type { WellnessToday } from "@/lib/types";

const ENERGY_LABELS = ["", "Muy baja", "Baja", "Normal", "Alta", "Muy alta"];

export function SleepForm({
  today,
  demoMode,
}: {
  today: WellnessToday;
  demoMode: boolean;
}) {
  const [state, action, pending] = useActionState(saveSleepLog, {});

  return (
    <form action={action}>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <div className="grid grid-cols-2 gap-3">
        <Field id="sleep-hours" label="Horas de sueño">
          <Input
            id="sleep-hours"
            name="hours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            defaultValue={today.sleep ? String(today.sleep.hours) : ""}
            required
            disabled={pending || demoMode}
          />
        </Field>
        <Field id="sleep-energy" label="Energía al despertar">
          <div
            role="radiogroup"
            aria-label="Energía al despertar"
            className="flex gap-1.5"
          >
            {[1, 2, 3, 4, 5].map((level) => (
              <label
                key={level}
                className={`flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-700 ${
                  (today.sleep?.energy ?? 0) === level
                    ? "border-teal-700 bg-teal-700 text-white dark:border-teal-400 dark:bg-teal-600"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                } ${pending || demoMode ? "pointer-events-none opacity-50" : ""}`}
                title={ENERGY_LABELS[level]}
              >
                <input
                  type="radio"
                  name="energy"
                  value={level}
                  defaultChecked={(today.sleep?.energy ?? 0) === level}
                  required
                  disabled={pending || demoMode}
                  className="sr-only"
                />
                {level}
                <span className="sr-only"> — {ENERGY_LABELS[level]}</span>
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Button type="submit" disabled={pending || demoMode}>
        {pending ? "Guardando…" : today.sleep ? "Corregir registro" : "Guardar registro"}
      </Button>
      {today.sleep && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Ya has registrado hoy: {today.sleep.hours} h · energía {today.sleep.energy}/5.
        </p>
      )}
    </form>
  );
}

export function JournalForm({
  today,
  demoMode,
}: {
  today: WellnessToday;
  demoMode: boolean;
}) {
  const [state, action, pending] = useActionState(saveJournalEntry, {});
  const journal = today.journal;

  return (
    <form action={action}>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <Field id="journal-g1" label="¿Por qué estás agradecido hoy?">
        <Input
          id="journal-g1"
          name="gratitude_1"
          defaultValue={journal?.gratitude_1 ?? ""}
          maxLength={300}
          required
          disabled={pending || demoMode}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="journal-g2" label="Segunda gratitud (opcional)">
          <Input
            id="journal-g2"
            name="gratitude_2"
            defaultValue={journal?.gratitude_2 ?? ""}
            maxLength={300}
            disabled={pending || demoMode}
          />
        </Field>
        <Field id="journal-g3" label="Tercera gratitud (opcional)">
          <Input
            id="journal-g3"
            name="gratitude_3"
            defaultValue={journal?.gratitude_3 ?? ""}
            maxLength={300}
            disabled={pending || demoMode}
          />
        </Field>
      </div>
      <Field id="journal-reflection" label="Reflexión breve (opcional)">
        <Textarea
          id="journal-reflection"
          name="reflection"
          defaultValue={journal?.reflection ?? ""}
          rows={3}
          maxLength={2000}
          disabled={pending || demoMode}
        />
      </Field>
      <Button type="submit" disabled={pending || demoMode}>
        {pending ? "Guardando…" : journal ? "Corregir entrada" : "Guardar entrada"}
      </Button>
      {journal && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Ya has escrito el micro-diario de hoy.
        </p>
      )}
    </form>
  );
}
