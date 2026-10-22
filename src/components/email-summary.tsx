"use client";

import { useActionState } from "react";
import {
  summarizeEmailAction,
  type EmailActionState,
} from "@/app/actions/emails";
import { Button } from "@/components/ui/button";
import type { EmailSummary } from "@/lib/ai/types";

/** Explica de dónde salió el resumen y qué hacer si no es el de la IA. */
function sourceLabel(summary: EmailSummary): string {
  if (summary.fuente === "ia") return "Resumen con IA";
  switch (summary.motivo) {
    case "desactivada":
      return "Resumen automático · la IA está desactivada en Ajustes";
    case "sin_proveedor":
      return "Resumen automático · la IA no está configurada en el servidor";
    case "respuesta_invalida":
      return "Resumen automático · la IA no devolvió un resumen válido";
    case "error_proveedor":
      return "Resumen automático · no se pudo contactar con la IA";
    default:
      return "Resumen automático (sin IA configurada)";
  }
}

/**
 * Resumen de un correo bajo demanda.
 *
 * El botón pide el resumen al servidor; allí se lee el cuerpo de Gmail, se
 * recorta y se resume. Aquí solo se muestra el resultado.
 */
export function EmailSummaryButton({ messageId }: { messageId: string }) {
  const [state, formAction, pending] = useActionState<EmailActionState, FormData>(
    summarizeEmailAction,
    {},
  );

  const summary = state.summary;
  const showResult = state.messageId === messageId && summary;

  return (
    <div className="mt-1.5">
      <form action={formAction}>
        <input type="hidden" name="message_id" value={messageId} />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="h-6 px-1.5 text-xs"
        >
          {pending ? "Resumiendo…" : "Resumir con IA"}
        </Button>
      </form>

      {showResult && (
        <div className="mt-1.5 space-y-1 rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
          <p className="text-zinc-800 dark:text-zinc-200">{summary.resumen}</p>
          {summary.puntos.length > 0 && (
            <ul className="list-inside list-disc space-y-0.5 text-zinc-600 dark:text-zinc-400">
              {summary.puntos.map((punto) => (
                <li key={punto}>{punto}</li>
              ))}
            </ul>
          )}
          {summary.tareas.length > 0 && (
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Sugerencias:{" "}
              </span>
              {summary.tareas.join(" · ")}
            </p>
          )}
          <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
            {sourceLabel(summary)}
            {summary.requiere_accion ? " · parece pedir una acción" : ""}
          </p>
          {state.notice && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              {state.notice}
            </p>
          )}
        </div>
      )}

      {state.error && (
        <p role="alert" className="mt-1 text-[11px] text-red-700 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
