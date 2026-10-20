import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DigestActions, DigestSettingsForm } from "@/components/digest-settings";
import { IntegrationsPanel } from "@/components/integrations-panel";
import { LogoutButton } from "@/components/logout-button";
import { Card } from "@/components/ui/card";
import {
  APP_URL,
  DEFAULT_TIMEZONE,
  isDemoMode,
  isGoogleConfigured,
} from "@/lib/config";
import { listIntegrations } from "@/lib/integrations/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_DIGEST_PREFERENCES,
  type DigestPreferences,
  type Integration,
} from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ajustes" };
export const instant = false;

export default async function AjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  await connection();
  const aviso = (await searchParams).aviso;

  let userEmail = "persona.demo@example.com";
  let displayName = "Persona de ejemplo";
  let preferences: DigestPreferences = DEFAULT_DIGEST_PREFERENCES;
  let integrations: Integration[] = [];
  let profileTimezone = DEFAULT_TIMEZONE;

  if (!isDemoMode()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase!.auth.getUser();
    if (!data.user) redirect("/login");
    userEmail = data.user.email ?? "";
    displayName =
      (data.user.user_metadata?.display_name as string) ?? displayName;

    const [{ data: prefs }, { data: profile }] = await Promise.all([
      supabase!.from("user_preferences").select("*").maybeSingle(),
      supabase!.from("profiles").select("*").maybeSingle(),
    ]);
    if (prefs) preferences = prefs as DigestPreferences;
    if (!preferences.digest_email) preferences.digest_email = userEmail;
    if (profile?.timezone) profileTimezone = profile.timezone;
    integrations = await listIntegrations(data.user.id);
  }

  const avisos: Record<string, string> = {
    conectado: "Conexión guardada. Ya puedes sincronizar tus datos.",
    oauth_fallido: "La conexión con Google no se pudo completar. Inténtalo de nuevo.",
    oauth_no_configurado:
      "Falta configurar las credenciales de Google OAuth en el entorno.",
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Ajustes
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Perfil, resumen matinal, conexiones y control de tus datos.
        </p>
      </header>

      {aviso && avisos[aviso] && (
        <p
          role="status"
          className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100"
        >
          {avisos[aviso]}
        </p>
      )}

      <Card title="Perfil">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Nombre</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">{displayName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Correo</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">{userEmail}</dd>
          </div>
          <div>
            <dt className="text-zinc-500 dark:text-zinc-400">Zona horaria</dt>
            <dd className="font-medium text-zinc-900 dark:text-zinc-100">
              {profileTimezone}
            </dd>
          </div>
        </dl>
        {!isDemoMode() && (
          <div className="mt-4">
            <LogoutButton />
          </div>
        )}
      </Card>

      <Card
        title="Resumen matinal"
        description="Se envía a la hora local que elijas. Puedes previsualizarlo y enviar una prueba antes de activarlo."
      >
        <DigestSettingsForm
          preferences={preferences}
          userEmail={userEmail}
          demoMode={isDemoMode()}
        />
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Probar el resumen
          </h3>
          <DigestActions demoMode={isDemoMode()} />
        </div>
      </Card>

      <Card
        title="Conexiones"
        description="Conecta o desconecta proveedores. Al desconectar se revoca el acceso y se borran los datos importados."
      >
        <IntegrationsPanel
          integrations={integrations}
          googleConfigured={isGoogleConfigured()}
          demoMode={isDemoMode()}
        />
      </Card>

      <Card title="Tus datos" description="Control y transparencia.">
        <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            · Desconectar una conexión borra su caché y credenciales asociadas.
          </li>
          <li>
            · El resumen usa solo la agenda, tareas y metadatos mínimos que tú
            conectas. No se guarda el cuerpo de los correos.
          </li>
          <li>
            ·{" "}
            <Link
              href="/privacidad"
              className="font-medium text-teal-800 underline dark:text-teal-200"
            >
              Lee la página de privacidad
            </Link>{" "}
            para ver qué datos se tratan y cómo ejercer tus derechos.
          </li>
          <li>
            · Exportación y eliminación completa de la cuenta: en el MVP se
            realiza eliminando la cuenta desde Supabase Auth; queda señalado
            como pendiente de automatizar.
          </li>
        </ul>
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          URL de la app para callbacks OAuth: {APP_URL}
        </p>
      </Card>
    </div>
  );
}
