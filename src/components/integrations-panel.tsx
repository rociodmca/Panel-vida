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
import { scopeLabel } from "@/lib/integrations/google/provider";
import type { AdminStatus } from "@/lib/supabase/health";
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

const PROVIDERS = ["google_calendar", "gmail"] as const;

const labels: Record<string, string> = {
  google_calendar: "Google Calendar",
  gmail: "Gmail (lectura)",
};

const descriptions: Record<string, string> = {
  google_calendar:
    "Lectura de eventos próximos. La edición se hace en el proveedor original.",
  gmail:
    "Lectura del correo (remitente, asunto, fragmento y contenido para resumir). No se guardan cuerpos ni adjuntos.",
};

/** Qué hacer según el estado de la clave de servicio de Supabase. */
function adminStatusMessage(status: AdminStatus): string {
  if (status === "sin_configurar") {
    return "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor. Sin ella no se pueden escribir los tokens cifrados ni la caché de Google.";
  }
  if (status === "invalido") {
    return "La clave SUPABASE_SERVICE_ROLE_KEY no es válida (Supabase la rechaza). Copia la secret key actual desde Supabase → Settings → API Keys, actualiza .env.local y reinicia el servidor.";
  }
  if (status === "sin_esquema") {
    return "Supabase no encuentra la tabla «integrations». Aplica las migraciones de supabase/migrations/ en el proyecto.";
  }
  return "No se pudo comprobar el estado de Supabase. Revisa la conexión y los registros del servidor antes de volver a intentarlo.";
}

export function IntegrationsPanel({
  integrations,
  googleConfigured,
  callbackUrl,
  adminStatus,
}: {
  integrations: Integration[];
  googleConfigured: boolean;
  callbackUrl: string;
  adminStatus: AdminStatus;
}) {
  const [disconnectState, disconnectActionForm, disconnectPending] = useActionState(
    disconnectAction,
    initial,
  );
  const [syncState, syncActionForm, syncPending] = useActionState(
    syncNowAction,
    initial,
  );

  const connectedCount = PROVIDERS.filter((provider) =>
    integrations.some((i) => i.provider === provider),
  ).length;
  const nothingConnected = connectedCount === 0;

  return (
    <div>
      {disconnectState.error && <FormError message={disconnectState.error} />}
      {disconnectState.success && <FormSuccess message={disconnectState.success} />}
      {syncState.error && <FormError message={syncState.error} />}
      {syncState.success && <FormSuccess message={syncState.success} />}

      {adminStatus !== "ok" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">El servidor no puede guardar credenciales</p>
          <p className="mt-1">{adminStatusMessage(adminStatus)}</p>
        </div>
      )}

      {!googleConfigured && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">OAuth de Google sin configurar</p>
          <p className="mt-1">
            Añade <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> y{" "}
            <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code> al
            entorno y registra esta URI de redirección en Google Cloud Console
            (credenciales OAuth 2.0 → URI de redirección autorizada):
          </p>
          <p className="mt-2 break-all rounded bg-white/70 px-2 py-1 font-mono text-xs dark:bg-zinc-900/70">
            {callbackUrl}
          </p>
          <p className="mt-2">
            Mientras tanto, el panel funciona con datos de demostración.
          </p>
        </div>
      )}

      {googleConfigured && nothingConnected && (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <p>
            Con una sola autorización puedes leer tu agenda y ver tus correos
            recientes dentro del panel, y pedir un resumen con IA de cada
            mensaje. Google pide permiso para cada bloque por separado: puedes
            concederlos juntos o uno a uno.
          </p>
          <a
            href="/api/integrations/google/start?target=ambos"
            className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-teal-700 px-3 text-sm font-medium text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
          >
            Conectar Google (agenda y correo)
          </a>
        </div>
      )}

      <ul className="space-y-3">
        {PROVIDERS.map((provider) => {
          const integration = integrations.find((i) => i.provider === provider);
          const needsReconnect = integration?.status === "error";
          return (
            <li
              key={provider}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {labels[provider]}
                  </p>
                  {integration ? (
                    <Badge>
                      {integration.status === "conectado"
                        ? "Conectado"
                        : needsReconnect
                          ? "Error de sincronización"
                          : integration.status}
                    </Badge>
                  ) : (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      No conectado
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {integration
                    ? `Última sincronización: ${formatSyncDate(integration.last_synced_at)} · Permisos: ${integration.scopes.length ? integration.scopes.map(scopeLabel).join(", ") : "—"}. Puedes revocar el acceso desde tu cuenta de Google.`
                    : descriptions[provider]}
                </p>
                {needsReconnect && (
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    La última sincronización falló. Inténtalo de nuevo; si el
                    aviso dice que la credencial caducó, vuelve a conectar.
                  </p>
                )}
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

      {googleConfigured && (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          URI de redirección registrada en Google Cloud Console:{" "}
          <code className="break-all font-mono">{callbackUrl}</code>
        </p>
      )}
    </div>
  );
}
