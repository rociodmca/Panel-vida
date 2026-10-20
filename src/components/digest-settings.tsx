"use client";

import { useActionState } from "react";
import {
  previewDigest,
  saveDigestPreferences,
  sendTestDigest,
  type DigestActionState,
} from "@/app/actions/digest";
import { Button } from "@/components/ui/button";
import { Field, Input, FormError, FormSuccess } from "@/components/ui/form";
import { DAY_LABELS, type DigestPreferences } from "@/lib/types";

const initial: DigestActionState = {};

export function DigestSettingsForm({
  preferences,
  userEmail,
  demoMode,
}: {
  preferences: DigestPreferences;
  userEmail: string;
  demoMode: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveDigestPreferences,
    initial,
  );

  return (
    <form action={action}>
      {state.error && <FormError message={state.error} />}
      {state.success && <FormSuccess message={state.success} />}
      {demoMode && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          En modo demostración las preferencias se muestran pero no se envía
          ningún correo.
        </p>
      )}

      <div className="mb-4 flex items-center gap-3">
        <input
          id="digest_enabled"
          name="digest_enabled"
          type="checkbox"
          defaultChecked={preferences.digest_enabled}
          className="size-4 rounded accent-teal-700"
        />
        <label htmlFor="digest_enabled" className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Enviar el resumen matinal por correo
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="digest_local_time" label="Hora local del resumen" hint="Formato 24 h. Por defecto 07:00.">
          <Input
            id="digest_local_time"
            name="digest_local_time"
            type="time"
            defaultValue={preferences.digest_local_time}
            required
          />
        </Field>
        <Field id="digest_email" label="Correo de destino" hint="Dirección donde recibir el resumen.">
          <Input
            id="digest_email"
            name="digest_email"
            type="email"
            defaultValue={preferences.digest_email || userEmail}
            required
          />
        </Field>
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Días activos
        </legend>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <label
              key={day}
              className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="checkbox"
                name="digest_days"
                value={day}
                defaultChecked={preferences.digest_days.includes(day)}
                className="size-4 rounded accent-teal-700"
              />
              {DAY_LABELS[day]}
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar preferencias"}
      </Button>
    </form>
  );
}

export function DigestActions({ demoMode }: { demoMode: boolean }) {
  const [previewState, previewAction, previewPending] = useActionState(
    async () => previewDigest(),
    initial,
  );
  const [testState, testAction, testPending] = useActionState(
    async () => sendTestDigest(),
    initial,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <form action={previewAction}>
          <Button variant="secondary" type="submit" disabled={previewPending}>
            {previewPending ? "Generando…" : "Vista previa"}
          </Button>
        </form>
        <form action={testAction}>
          <Button variant="secondary" type="submit" disabled={testPending}>
            {testPending ? "Enviando…" : "Enviar prueba"}
          </Button>
        </form>
        {demoMode && (
          <span className="self-center text-xs text-zinc-500 dark:text-zinc-400">
            El envío real requiere configurar Supabase y el correo saliente.
          </span>
        )}
      </div>

      {previewState.error && <FormError message={previewState.error} />}
      {testState.error && <FormError message={testState.error} />}
      {testState.success && <FormSuccess message={testState.success} />}

      {(previewState.previewText || testState.previewText) && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {previewState.previewText ?? testState.previewText}
        </pre>
      )}
    </div>
  );
}
