"use server";

import { revalidatePath } from "next/cache";
import { isGoogleConfigured } from "@/lib/config";
import { refreshStoredToken } from "@/lib/integrations/google/tokens";
import {
  disconnectIntegration,
  getIntegrationForUser,
  markSyncResult,
} from "@/lib/integrations/repository";
import { syncCalendar, syncGmail } from "@/lib/integrations/sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface IntegrationActionState {
  error?: string;
  success?: string;
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function disconnectAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Inicia sesión para gestionar conexiones." };
  const integrationId = String(formData.get("integration_id") ?? "");
  if (!integrationId) return { error: "Conexión no indicada." };

  const result = await disconnectIntegration(userId, integrationId);
  if (!result.ok) return { error: "No se pudo desconectar. Inténtalo de nuevo." };
  revalidatePath("/ajustes");
  revalidatePath("/hoy");
  revalidatePath("/agenda");
  return { success: "Conexión eliminada y datos importados borrados." };
}

export async function syncNowAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Inicia sesión para sincronizar." };
  if (!isGoogleConfigured()) return { error: "Google OAuth no está configurado." };

  const integrationId = String(formData.get("integration_id") ?? "");
  if (!integrationId) return { error: "Conexión no indicada." };

  // La conexión debe pertenecer a quien pide la sincronización.
  const integration = await getIntegrationForUser(userId, integrationId);
  if (!integration) {
    return { error: "Esa conexión no existe o no es tuya." };
  }

  const refresh = await refreshStoredToken(integrationId);
  if (!refresh.ok) {
    if (refresh.reason === "credencial_invalida") {
      await markSyncResult(integrationId, userId, 0, "credencial_invalida");
      return {
        error:
          "La credencial de Google ya no es válida (se revocó o caducó). Vuelve a conectar tu cuenta.",
      };
    }
    if (refresh.reason === "clave_ausente") {
      return { error: "Falta TOKEN_ENCRYPTION_KEY en el entorno del servidor." };
    }
    return { error: "No se pudo renovar la credencial. Conéctate de nuevo." };
  }

  const provider = integration.provider;
  const outcome =
    provider === "gmail"
      ? await syncGmail(userId, integrationId, refresh.accessToken)
      : await syncCalendar(userId, integrationId, refresh.accessToken);

  if (!outcome.ok) {
    return { error: "La sincronización falló. Se ha registrado el error." };
  }

  revalidatePath("/hoy");
  revalidatePath("/agenda");
  revalidatePath("/ajustes");
  return {
    success:
      provider === "gmail"
        ? `Sincronizados ${outcome.items} mensajes (solo metadatos).`
        : `Sincronizados ${outcome.items} eventos.`,
  };
}
