import { NextResponse } from "next/server";
import { CRON_SECRET, isDemoMode } from "@/lib/config";
import { localDayKey, localTimeKey } from "@/lib/datetime";
import { buildDigestEmail } from "@/lib/digest/build";
import { phraseOfTheDay } from "@/lib/digest/phrase";
import { fetchTodayWeather } from "@/lib/digest/weather";
import { shouldSendDigest, weekdayIndex } from "@/lib/digest/schedule";
import { sendEmail } from "@/lib/email/sender";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DigestPreferences } from "@/lib/types";

/**
 * Envío del resumen matinal.
 * Protegido con CRON_SECRET (Vercel Cron envía Authorization: Bearer <secret>).
 * Idempotente: UNIQUE(user_id, local_date) en digest_deliveries evita duplicados.
 *
 * Nota: en plan Hobby, Vercel ejecuta el cron una vez al día con variabilidad
 * dentro de la hora configurada; no se promete precisión al minuto.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "no_autorizado" }, { status: 401 });
  }

  if (isDemoMode()) {
    return NextResponse.json(
      { ok: false, modo: "demo", detalle: "Supabase no está configurado; nada que enviar." },
      { status: 503 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "admin_no_configurado" }, { status: 503 });
  }

  const { data: prefsRows, error: prefsError } = await admin
    .from("user_preferences")
    .select("user_id, digest_enabled, digest_local_time, digest_days, digest_email");

  if (prefsError) {
    console.error(JSON.stringify({ level: "error", msg: "digest_prefs_error" }));
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  let enviados = 0;
  let omitidos = 0;
  let fallos = 0;

  // Clima y frase se calculan una sola vez para toda la tanda.
  const [weather, phrase] = await Promise.all([
    fetchTodayWeather(),
    Promise.resolve(phraseOfTheDay(localDayKey())),
  ]);

  for (const row of prefsRows ?? []) {
    const prefs = row as DigestPreferences & { user_id: string; digest_email: string | null };
    if (!prefs.digest_enabled || !prefs.digest_email) continue;

    const enviar = shouldSendDigest({
      currentTimeKey: localTimeKey(),
      digestLocalTime: prefs.digest_local_time,
      digestDays: prefs.digest_days ?? [],
      weekday: weekdayIndex(),
    });
    if (!enviar) continue;

    const localDate = localDayKey();

    // Idempotencia: si ya hay registro (incluso fallido), no se reintenta en esta pasada.
    const { count } = await admin
      .from("digest_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", prefs.user_id)
      .eq("local_date", localDate);
    if (count && count > 0) {
      omitidos += 1;
      continue;
    }

    const { data: user } = await admin.auth.admin.getUserById(prefs.user_id);
    const [{ data: events }, { data: tasks }, { data: emails }] = await Promise.all([
      admin
        .from("events_cache")
        .select("*")
        .eq("user_id", prefs.user_id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(5),
      admin
        .from("tasks")
        .select("*")
        .eq("user_id", prefs.user_id)
        .eq("status", "pendiente")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(10),
      admin
        .from("email_items_cache")
        .select("*")
        .eq("user_id", prefs.user_id)
        .order("received_at", { ascending: false })
        .limit(5),
    ]);

    const digest = buildDigestEmail({
      displayName: (user.user?.user_metadata?.display_name as string) ?? null,
      localDate: new Date(),
      events: (events ?? []) as never,
      tasks: (tasks ?? []) as never,
      emails: (emails ?? []) as never,
      integrationsAvailable: (events?.length ?? 0) > 0 || (emails?.length ?? 0) > 0,
      weather,
      phrase,
    });

    const result = await sendEmail({
      to: prefs.digest_email,
      subject: digest.subject,
      text: digest.text,
      html: digest.html,
    });

    await admin.from("digest_deliveries").insert({
      user_id: prefs.user_id,
      local_date: localDate,
      sent_at: result.ok ? new Date().toISOString() : null,
      status: result.ok ? "enviado" : "error",
      idempotency_key: `${prefs.user_id}:${localDate}`,
      error_code: result.ok ? null : result.error ?? "desconocido",
    });

    if (result.ok) enviados += 1;
    else fallos += 1;
  }

  console.info(
    JSON.stringify({ level: "info", msg: "digest_cron_completado", enviados, omitidos, fallos }),
  );
  return NextResponse.json({ ok: true, enviados, omitidos, fallos });
}
