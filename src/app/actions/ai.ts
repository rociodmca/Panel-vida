"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AiActionState {
  error?: string;
  success?: string;
}

/**
 * Guarda el consentimiento para resumir correo con IA.
 *
 * Es un opt-in explícito y revocable: solo se envía contenido a un proveedor
 * externo si esta preferencia está activa. Si no hay proveedor configurado en
 * el servidor, la app usa el resumen determinista.
 */
export async function saveAiConsent(
  _prev: AiActionState,
  formData: FormData,
): Promise<AiActionState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase no está configurado en este entorno." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const aiEnabled = formData.get("ai_enabled") === "on";

  const { error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: user.id,
        ai_enabled: aiEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    return { error: "No se pudo guardar tu elección. Inténtalo de nuevo." };
  }

  revalidatePath("/ajustes");
  return {
    success: aiEnabled
      ? "Resumen con IA activado."
      : "Resumen con IA desactivado. Se usará el resumen local.",
  };
}
