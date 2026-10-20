"use client";

import { useActionState } from "react";
import {
  disconnectAction,
  syncNowAction,
  type IntegrationActionState,
} from "@/app/actions/integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess } from "@/components/ui/form";
import type { Integration } from "@/lib/types";

const initial: IntegrationActionState = {};

function formatSyncDate(value: string | null): string {
  if (!value) return "nunca";
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  });
}

export function IntegrationsPanel({
  integrations,
  googleConfigured,
  demoMode,
}: {
  integrations: Integration[];
  googleConfigured: boolean;
  demoMode: boolean;
}) {
  const [disconnectState, disconnectActionForm, disconnectPending] = useActionState(
    disconnectAction,
    initial,
  );
  const [syncState, syncActionForm, syncPending] = useActionState(
    syncNowAction,
    initial,
  );

  const labels: Record<string, string> = {
    google_calendar: "Google Calendar",
    gmail: "Gmail (solo metadatos)",
  };

  return (
    <div>
      {disconnectState.error && <FormError message={disconnectState.error} />}
      {disconnectState.success && <FormSuccess message={disconnectState.success} />}
      {syncState.error && <FormError message={syncState.error} />}
      {syncState.success && <FormSuccess message={syncState.success} />}

      {!googleConfigured && (
        <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          OAuth de Google sin configurar. Añade{" "}
          <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> y{" "}
          <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code> en el
          entorno (ver <code className="font-mono text-xs">.env.example</code>) y
          registra la URI{" "}
          <code className="font-mono text-xs">
            {demoMode ? "http://localhost:3000" : ""}/api/integrations/google/callback
          </code>{" "}
          en Google Cloud Console. Mientras tanto, el panel funciona con datos
          de demostración.
        </p>
      )}

      <ul className="space-y-3">
        {(["google_calendar", "gmail"] as const).map((provider) => {
          const integration = integrations.find((i) => i.provider === provider);
          return (
            <li
              key={provider}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {labels[provider]}
                  </p>
                  {integration ? (
                    <Badge>
                      {integration.status === "conectado" ? "Conectado" : integration.status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      No conectado
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {integration
                    ? `Última sincronización: ${formatSyncDate(integration.last_synced_at)} · Permisos: ${integration.scopes.length ? integration.scopes.join(", ") : "—"}. Puedes revocar el acceso desde tu cuenta de Google.`
                    : provider === "gmail"
                      ? "Lectura de metadatos (remitente, asunto, fecha). No se guardan cuerpos ni adjuntos."
                      : "Lectura de eventos próximos. La edición se hace en el proveedor original."}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {integration ? (
                  <>
                    <form action={syncActionForm}>
                      <input type="hidden" name="integration_id" value={integration.id} />
                      <input type="hidden" name="provider" value={provider} />
                      <Button
                        variant="secondary"
                        size="sm"
                        type="submit"
                        disabled={syncPending || !googleConfigured}
                      >
                        {syncPending ? "Sincronizando…" : "Sincronizar"}
                      </Button>
                    </form>
                    <form action={disconnectActionForm}>
                      <input type="hidden" name="integration_id" value={integration.id} />
                      <Button
                        variant="danger"
                        size="sm"
                        type="submit"
                        disabled={disconnectPending}
                      >
                        {disconnectPending ? "Eliminando…" : "Desconectar"}
                      </Button>
                    </form>
                  </>
                ) : (
                  <a
                    href={`/api/integrations/google/start?target=${provider}`}
                    aria-disabled={!googleConfigured}
                    className={`inline-flex min-h-8 items-center rounded-lg bg-teal-700 px-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                      !googleConfigured ? "pointer-events-none opacity-50" : ""
                    }`}
                  >
                    Conectar
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
