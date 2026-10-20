"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRefreshToken } from "@/lib/integrations/repository";
import { decryptStoredSecret } from "@/lib/integrations/crypto";
import { googleProvider } from "@/lib/integrations/google/provider";

export interface DataActionState {
  error?: string;
  /** JSON a descargar; solo presente tras una exportación correcta. */
  exported?: string;
}

const EXPORTABLE_TABLES = [
  "profiles",
  "user_preferences",
  "integrations",
  "calendar_sources",
  "events_cache",
  "email_items_cache",
  "tasks",
  "notes",
  "gym_sessions",
  "digest_deliveries",
  "sync_runs",
] as const;

/** Exporta todos los datos personales del usuario como JSON descargable.
 *  Nunca incluye tokens ni credenciales (integration_secrets queda fuera). */
export async function exportAccountData(): Promise<DataActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  try {
    const dump: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
    };
    for (const table of EXPORTABLE_TABLES) {
      const { data: rows, error } = await supabase.from(table).select("*");
      if (error) return { error: `No se pudo exportar «${table}».` };
      dump[table] = rows ?? [];
    }
    return { exported: JSON.stringify(dump, null, 2) };
  } catch {
    return { error: "La exportación ha fallado. Inténtalo de nuevo." };
  }
}

/** Elimina todos los datos personales y la cuenta. Irreversible.
 *  1) Revoca los tokens de Google (best effort), 2) borra las filas propias,
 *  3) elimina el usuario de Auth. Si algo crítico falla, no se elimina la cuenta. */
export async function deleteAccountData(): Promise<DataActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { error: "El servicio de borrado no está disponible." };

  try {
    // 1) Revocación remota de credenciales (best effort: falla → seguimos).
    const { data: integrations } = await admin
      .from("integrations")
      .select("id")
      .eq("user_id", user.id);
    for (const integration of integrations ?? []) {
      try {
        const stored = await getRefreshToken(integration.id);
        if (stored) await googleProvider.revoke(decryptStoredSecret(stored));
      } catch {
        // Token ilegible o revocación imposible: la eliminación local manda.
      }
    }

    // 2) Borrado local de todo lo que pertenece al usuario.
    const deletions = [
      admin.from("tasks").delete().eq("user_id", user.id),
      admin.from("notes").delete().eq("user_id", user.id),
      admin.from("events_cache").delete().eq("user_id", user.id),
      admin.from("email_items_cache").delete().eq("user_id", user.id),
      admin.from("calendar_sources").delete().eq("user_id", user.id),
      admin.from("gym_sessions").delete().eq("user_id", user.id),
      admin.from("sync_runs").delete().eq("user_id", user.id),
      admin.from("digest_deliveries").delete().eq("user_id", user.id),
      admin.from("integration_secrets").delete().in(
        "integration_id",
        (integrations ?? []).map((i) => i.id),
      ),
      admin.from("integrations").delete().eq("user_id", user.id),
      admin.from("user_preferences").delete().eq("user_id", user.id),
      admin.from("profiles").delete().eq("user_id", user.id),
    ];
    const results = await Promise.all(deletions);
    const failed = results.some((r) => Boolean((r as { error?: unknown }).error));
    if (failed) {
      return { error: "No se pudieron borrar todos los datos. Inténtalo de nuevo." };
    }

    // 3) Cuenta eliminada: la sesión actual queda inválida.
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      return {
        error:
          "Los datos se han borrado, pero no se pudo eliminar la cuenta. Inténtalo de nuevo.",
      };
    }
  } catch {
    return { error: "La eliminación ha fallado. Inténtalo de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
