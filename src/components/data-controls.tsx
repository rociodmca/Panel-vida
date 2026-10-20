"use client";

import { useEffect, useActionState, useState } from "react";
import { deleteAccountData, exportAccountData } from "@/app/actions/account";
import { Button } from "@/components/ui/button";

export function DataControls({ demoMode }: { demoMode: boolean }) {
  const [exportState, runExport, exportPending] = useActionState(
    async () => exportAccountData(),
    {},
  );
  const [deleteState, runDelete, deletePending] = useActionState(
    async () => deleteAccountData(),
    {},
  );
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!exportState.exported) return;
    const blob = new Blob([exportState.exported], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `panel-de-vida-datos-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [exportState.exported]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form action={runExport}>
          <Button variant="secondary" type="submit" disabled={demoMode || exportPending}>
            {exportPending ? "Preparando…" : "Exportar mis datos (JSON)"}
          </Button>
        </form>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Incluye perfil, preferencias, tareas, agenda, correos y registros.
          Nunca credenciales.
        </p>
      </div>
      {exportState.error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {exportState.error}
        </p>
      )}

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        {confirming ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Esto borra todos tus datos y elimina la cuenta de forma
              irreversible: tareas, agenda, correos guardados, preferencias y
              conexiones. Se pedirá revocar el acceso de Google.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={runDelete}>
                <Button variant="danger" type="submit" disabled={deletePending}>
                  {deletePending ? "Eliminando…" : "Sí, eliminar todo"}
                </Button>
              </form>
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={deletePending}
              >
                Cancelar
              </Button>
            </div>
            {deleteState.error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                {deleteState.error}
              </p>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            className="text-red-700 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            onClick={() => setConfirming(true)}
            disabled={demoMode}
          >
            Eliminar mi cuenta y mis datos
          </Button>
        )}
        {demoMode && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            En modo demo no hay cuenta real: no hay nada que exportar ni borrar.
          </p>
        )}
      </div>
    </div>
  );
}
