import { NextResponse, type NextRequest } from "next/server";
import { APP_URL, isGoogleConfigured } from "@/lib/config";
import { listCalendars, listUpcomingEvents } from "@/lib/integrations/google/calendar";
import { listRecentMessageMetadata } from "@/lib/integrations/google/gmail";
import { googleProvider } from "@/lib/integrations/google/provider";
import {
  encryptSecret,
  hasTokenEncryptionKey,
} from "@/lib/integrations/crypto";
import {
  listIntegrations,
  markSyncResult,
  upsertIntegration,
} from "@/lib/integrations/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

const CALLBACK_URL = `${APP_URL}/api/integrations/google/callback`;

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/ajustes?aviso=oauth_no_configurado", request.url),
    );
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("oauth_state")?.value;
  const userId = cookieStore.get("oauth_user")?.value;
  const target = cookieStore.get("oauth_target")?.value ?? "google_calendar";
  const codeVerifier = cookieStore.get("oauth_pkce_verifier")?.value;

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const fail = (detalle: string) =>
    NextResponse.redirect(new URL(`/ajustes?aviso=oauth_fallido&detalle=${detalle}`, request.url));

  if (oauthError) return fail("denegado");
  if (!code || !state || !expectedState || state !== expectedState) return fail("state");
  if (!codeVerifier) return fail("pkce");
  if (!userId) return fail("sesion");
  if (!hasTokenEncryptionKey()) return fail("config_clave_cifrado");

  cookieStore.delete("oauth_state");
  cookieStore.delete("oauth_user");
  cookieStore.delete("oauth_target");
  cookieStore.delete("oauth_pkce_verifier");

  try {
    const tokens = await googleProvider.exchangeCode(code, CALLBACK_URL, codeVerifier);
    const profile = await googleProvider.fetchProfile(tokens.accessToken);

    const provider =
      target === "gmail" ? ("gmail" as const) : ("google_calendar" as const);

    const error = await upsertIntegration({
      userId,
      provider,
      providerAccountId: profile.providerAccountId,
      scopes: (tokens.scope ?? "").split(" ").filter(Boolean),
      encryptedRefreshToken: tokens.refreshToken
        ? encryptSecret(tokens.refreshToken)
        : "",
    });
    if (error) return fail("guardado");

    if (provider === "gmail") await syncGmail(userId, tokens.accessToken);
    else await syncCalendar(userId, tokens.accessToken);

    return NextResponse.redirect(new URL("/ajustes?aviso=conectado", request.url));
  } catch {
    return fail("token");
  }
}

async function syncGmail(userId: string, accessToken: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const integrations = await listIntegrations(userId);
  const gmail = integrations.find((i) => i.provider === "gmail");
  if (!gmail) return;
  try {
    const metas = await listRecentMessageMetadata(accessToken, 10);
    for (const meta of metas) {
      await admin.from("email_items_cache").upsert(
        {
          user_id: userId,
          integration_id: gmail.id,
          external_id: meta.externalId,
          sender_name: meta.senderName,
          sender_email: meta.senderEmail,
          subject: meta.subject,
          received_at: meta.receivedAt,
          is_unread: meta.isUnread,
          is_important: meta.isImportant,
          external_url: meta.externalUrl,
        },
        { onConflict: "integration_id,external_id" },
      );
    }
    await markSyncResult(gmail.id, userId, metas.length);
  } catch {
    await markSyncResult(gmail.id, userId, 0, "sync_gmail");
  }
}

async function syncCalendar(userId: string, accessToken: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const integrations = await listIntegrations(userId);
  const calendar = integrations.find((i) => i.provider === "google_calendar");
  if (!calendar) return;
  try {
    const calendars = (await listCalendars(accessToken)).filter(
      (c) => c.selected !== false,
    );
    let total = 0;
    for (const cal of calendars) {
      const { data: source } = await admin
        .from("calendar_sources")
        .upsert(
          {
            user_id: userId,
            integration_id: calendar.id,
            external_id: cal.id,
            name: cal.summary,
            enabled: true,
          },
          { onConflict: "integration_id,external_id" },
        )
        .select("id")
        .single();

      const events = await listUpcomingEvents(accessToken, cal.id, 25);
      for (const event of events) {
        await admin.from("events_cache").upsert(
          {
            user_id: userId,
            calendar_source_id: source?.id ?? null,
            external_id: `${cal.id}:${event.externalId}`,
            title: event.title,
            starts_at: event.startsAt,
            ends_at: event.endsAt,
            all_day: event.allDay,
            location: event.location,
            external_url: event.externalUrl,
          },
          { onConflict: "user_id,external_id" },
        );
        total += 1;
      }
    }
    await markSyncResult(calendar.id, userId, total);
  } catch {
    await markSyncResult(calendar.id, userId, 0, "sync_calendar");
  }
}
