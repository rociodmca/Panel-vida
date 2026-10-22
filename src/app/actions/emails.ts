"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveGoogleToken } from "@/lib/integrations/google/credentials";
import {
  fetchMessageContent,
  GmailApiError,
} from "@/lib/integrations/google/gmail";
import { summarizeEmail } from "@/lib/ai/summarize-email";
import { getAiProvider } from "@/lib/ai/provider";
import type { EmailSummary } from "@/lib/ai/types";

export interface EmailActionState {
  error?: string;
  summary?: EmailSummary;
  /** Identificador del correo resumido, para pintar el resultado en su sitio. */
  messageId?: string;
  /** Aviso honesto cuando el resumen se hizo sin el cuerpo completo. */
  notice?: string;
}

/**
 * Resumen de un correo con IA (o con la plantilla determinista).
 *
 * El cuerpo del mensaje se pide a Gmail en el momento, se recorta y no se
 * guarda: a la base de datos solo llega el resumen. Si no hay credencial de
 * Gmail o la lectura falla, se usa el fragmento ya sincronizado y se avisa.
 * La búsqueda del mensaje se hace con el usuario de la sesión, así que nadie
 * puede resumir el correo de otra persona.
 */
export async function summarizeEmailAction(
  _prev: EmailActionState,
  formData: FormData,
): Promise<EmailActionState> {
  const messageId = String(formData.get("message_id") ?? "").trim();
  if (!messageId) return { error: "No se indicó el mensaje." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // RLS: solo se ven los correos del usuario de la sesión.
  const { data: message } = await supabase
    .from("email_items_cache")
    .select("external_id, subject, sender_name, sender_email, snippet")
    .eq("external_id", messageId)
    .limit(1)
    .maybeSingle();
  if (!message) {
    return { error: "Ese mensaje no está en tu correo sincronizado." };
  }

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("ai_enabled")
    .maybeSingle();
  const aiEnabled = preferences?.ai_enabled !== false;

  // Se intenta leer el cuerpo completo en Gmail. Si no hay credencial válida o
  // la lectura falla, se resume el fragmento ya sincronizado y se avisa: es
  // preferible a bloquear la función y no envía datos nuevos a nadie.
  const token = await resolveGoogleToken(user.id, "gmail");
  let subject = message.subject ?? "";
  let from = message.sender_name || message.sender_email || "";
  let body = message.snippet?.trim() ?? "";
  let fragmentOnly = true;
  let notice: string | undefined;

  if (token.ok) {
    try {
      const content = await fetchMessageContent(token.token, messageId);
      subject = content.subject || subject;
      from = content.from || from;
      if (content.body.trim()) {
        body = content.body;
        fragmentOnly = false;
      } else if (body) {
        notice =
          "El correo llegó sin texto legible; el resumen usa el fragmento sincronizado.";
      }
    } catch (error) {
      if (
        error instanceof GmailApiError &&
        (error.status === 403 || error.status === 401)
      ) {
        notice =
          "Gmail no permitió leer el cuerpo con los permisos actuales. El resumen usa el fragmento sincronizado; vuelve a conectar la cuenta para el texto completo.";
      } else if (body) {
        notice =
          "No se pudo leer el cuerpo desde Gmail. El resumen usa el fragmento sincronizado.";
      } else {
        return { error: "No se pudo leer el correo desde Gmail. Inténtalo de nuevo." };
      }
    }
  } else if (body) {
    notice = `${tokenErrorMessage(token.reason)} Mientras tanto, el resumen se hace con el fragmento sincronizado.`;
  } else {
    return { error: tokenErrorMessage(token.reason) };
  }

  const summary = await summarizeEmail(
    { subject, from, body, fragmentOnly },
    { aiEnabled },
  );

  // Diagnóstico sin datos privados: ni el correo ni su contenido se registran.
  console.info(
    JSON.stringify({
      event: "email_summary",
      ai_enabled: aiEnabled,
      provider_configured: Boolean(getAiProvider()),
      source: summary.fuente,
      reason: summary.motivo ?? null,
      body_source: fragmentOnly ? "fragmento" : "gmail",
    }),
  );

  // Solo se guarda el resumen, nunca el cuerpo del correo.
  const { error: saveError } = await supabase.from("email_summaries").upsert(
    {
      user_id: user.id,
      email_external_id: messageId,
      summary: summary.resumen,
      bullets: summary.puntos,
      requires_action: summary.requiere_accion,
      source: summary.fuente,
    },
    { onConflict: "user_id,email_external_id" },
  );

  revalidatePath("/hoy");
  if (saveError) {
    return {
      summary,
      messageId,
      notice,
      error:
        "El resumen se generó pero no se pudo guardar (¿falta la migración 0005?).",
    };
  }
  return { summary, messageId, notice };
}

function tokenErrorMessage(reason: string): string {
  if (reason === "sin_conexion") {
    return "Conecta Gmail en Ajustes para poder resumir correos.";
  }
  if (reason === "credencial_invalida") {
    return "La credencial de Google ya no es válida. Vuelve a conectar la cuenta.";
  }
  if (reason === "sin_permiso_lectura") {
    return "Tu conexión no tiene permiso de lectura de correo. Vuelve a conectarla.";
  }
  return "No se pudo obtener una credencial de Google válida. Inténtalo de nuevo.";
}
