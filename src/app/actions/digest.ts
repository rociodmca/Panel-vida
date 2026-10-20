"use server";

import { revalidatePath } from "next/cache";
import { APP_URL, EMAIL_FROM, isDemoMode, isSupabaseConfigured } from "@/lib/config";
import { localDayKey } from "@/lib/datetime";
import { buildDigestEmail, type DigestData } from "@/lib/digest/build";
import { phraseOfTheDay } from "@/lib/digest/phrase";
import { fetchTodayWeather } from "@/lib/digest/weather";
import { sendEmail } from "@/lib/email/sender";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DigestPreferences } from "@/lib/types";

export interface DigestActionState {
  error?: string;
  success?: string;
  previewSubject?: string;
  previewText?: string;
}

async function requireUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function saveDigestPreferences(
  _prev: DigestActionState,
  formData: FormData,
): Promise<DigestActionState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: "Inicia sesión para guardar tus preferencias." };
  }

  const digestEnabled = formData.get("digest_enabled") === "on";
  const digestLocalTime = String(formData.get("digest_local_time") ?? "07:00");
  const digestEmail = String(formData.get("digest_email") ?? "").trim();
  const days = formData
    .getAll("digest_days")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);

  if (digestEnabled && days.length === 0) {
    return { error: "Selecciona al menos un día para el resumen." };
  }
  if (!/^\d{2}:\d{2}$/.test(digestLocalTime)) {
    return { error: "La hora del resumen no es válida." };
  }

  const supabase = (await createSupabaseServerClient())!;
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: userId,
    digest_enabled: digestEnabled,
    digest_local_time: digestLocalTime,
    digest_days: days.length ? days : [1, 2, 3, 4, 5],
    digest_email: digestEmail || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "No se pudieron guardar las preferencias." };

  revalidatePath("/ajustes");
  return { success: "Preferencias guardadas." };
}

export async function previewDigest(): Promise<DigestActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Inicia sesión para ver la vista previa." };

  const supabase = (await createSupabaseServerClient())!;
  const [eventsRes, tasksRes, emailRes] = await Promise.all([
    supabase
      .from("events_cache")
      .select("*")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(5),
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "pendiente")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(10),
    supabase
      .from("email_items_cache")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(5),
  ]);

  const { data: userData } = await supabase.auth.getUser();

  // Clima real (mejor esfuerzo) y frase determinista, como en el cron.
  const [weather] = await Promise.all([fetchTodayWeather()]);

  const data: DigestData = {
    displayName: userData.user?.user_metadata?.display_name ?? null,
    localDate: new Date(),
    events: (eventsRes.data ?? []) as DigestData["events"],
    tasks: (tasksRes.data ?? []) as DigestData["tasks"],
    emails: (emailRes.data ?? []) as DigestData["emails"],
    integrationsAvailable: (eventsRes.data?.length ?? 0) > 0 || (emailRes.data?.length ?? 0) > 0,
    weather,
    phrase: phraseOfTheDay(localDayKey()),
  };

  const email = buildDigestEmail(data);
  return { previewSubject: email.subject, previewText: email.text };
}

export async function sendTestDigest(): Promise<DigestActionState> {
  const userId = await requireUserId();
  if (!userId) return { error: "Inicia sesión para enviar la prueba." };

  if (isDemoMode() || !isSupabaseConfigured()) {
    const preview = await previewDigest();
    if (preview.error) return preview;
    return {
      ...preview,
      success:
        "Modo demostración: no se ha enviado ningún correo real. Así se vería el resumen.",
    };
  }
  if (!EMAIL_FROM) {
    return { error: "Falta configurar EMAIL_FROM (correo saliente) en el entorno." };
  }

  const supabase = (await createSupabaseServerClient())!;
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("*")
    .maybeSingle();
  const preferences = prefs as DigestPreferences | null;
  const destination = preferences?.digest_email;
  if (!destination) {
    return { error: "Guarda primero una dirección de correo para el resumen." };
  }

  const preview = await previewDigest();
  if (preview.error || !preview.previewText) return preview;

  const result = await sendEmail({
    to: destination,
    from: EMAIL_FROM,
    subject: `[Prueba] ${preview.previewSubject ?? "Resumen de hoy"}`,
    text: preview.previewText,
    headers: { "X-Panel-Vida-App": APP_URL },
  });
  if (!result.ok) {
    return { error: "El proveedor de correo rechazó el envío. Revisa la configuración." };
  }
  return { success: `Prueba enviada a ${destination}.`, ...preview };
}
