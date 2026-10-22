"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveGoogleToken } from "@/lib/integrations/google/credentials";
import {
  fetchMessageContent,
  GmailApiError,
} from "@/lib/integrations/google/gmail";
import { summarizeEmail } from "@/lib/ai/summarize-email";
import type { EmailSummary } from "@/lib/ai/types";

export interface EmailActionState {
  error?: string;
  summary?: EmailSummary;
  /** Identificador del correo resumido, para pintar el resultado en su sitio. */
  messageId?: string;
}

/**
 * Resumen de un correo con IA (o con la plantilla determinista).
 *
 * El cuerpo del mensaje se pide a Gmail en el momento, se recorta y no se
 * guarda: a la base de datos solo llega el resumen. La búsqueda del mensaje
 * se hace con el usuario de la sesión, así que nobody puede resumir el
 * correo de otra persona.
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
    .select("external_id, subject, sender_name, sender_email")
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

  const token = await resolveGoogleToken(user.id, "gmail");
  if (!token.ok) {
    return { error: tokenErrorMessage(token.reason) };
  }

  let content;
  try {
    content = await fetchMessageContent(token.token, messageId);
  } catch (error) {
    if (error instanceof GmailApiError && (error.status === 403 || error.status === 401)) {
      return {
        error:
          "Tu conexión de Gmail no permite leer el contenido. Vuelve a conectar la cuenta con los permisos de lectura.",
      };
    }
    return { error: "No se pudo leer el correo desde Gmail. Inténtalo de nuevo." };
  }

  const summary = await summarizeEmail(
    {
      subject: content.subject || message.subject,
      from: content.from || message.sender_name || message.sender_email,
      body: content.body,
    },
    { aiEnabled },
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
      error:
        "El resumen se generó pero no se pudo guardar (¿falta la migración 0005?).",
    };
  }
  return { summary, messageId };
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
