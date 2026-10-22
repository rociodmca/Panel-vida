"use client";

import { useActionState } from "react";
import { saveAiConsent, type AiActionState } from "@/app/actions/ai";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form";

const initial: AiActionState = {};

export function AiSettings({
  aiEnabled,
  providerConfigured,
  model,
}: {
  aiEnabled: boolean;
  providerConfigured: boolean;
  model: string;
}) {
  const [state, action, pending] = useActionState(saveAiConsent, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error && <FormError message={state.error} />}
      {state.success && <FormSuccess message={state.success} />}

      <div className="flex items-center gap-3">
        <input
          id="ai_enabled"
          name="ai_enabled"
          type="checkbox"
          defaultChecked={aiEnabled}
          className="size-4 rounded accent-teal-700"
        />
        <label
          htmlFor="ai_enabled"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Resumir el correo con IA
        </label>
        <span
          className={
            providerConfigured
              ? "rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 dark:bg-teal-900 dark:text-teal-100"
              : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100"
          }
        >
          {providerConfigured
            ? `Proveedor configurado${model ? `: ${model}` : ""}`
            : "Sin proveedor configurado"}
        </span>
      </div>

      {providerConfigured ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Al resumir, el proveedor recibe el asunto, el remitente y un recorte
          del cuerpo del correo. Nada más. El resultado se guarda en tu panel y
          el texto del correo no se almacena.
        </p>
      ) : (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Falta configurar el proveedor de IA en el servidor. Mientras tanto
          los resúmenes se generan en local, sin enviar nada fuera.
        </p>
      )}

      <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        <li>
          · Puedes revocarlo aquí en cualquier momento: los resúmenes passarán a
          generarse en local.
        </li>
        <li>
          · El texto del correo se trata como dato, nunca como instrucciones: el
          modelo solo puede resumir.
        </li>
        <li>
          · Si el proveedor falla, se usa el resumen determinista y el resumen
          matinal se envía igual.
        </li>
      </ul>

      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar elección"}
      </Button>
    </form>
  );
}
