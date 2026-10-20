import type { CalendarEventDraft } from "@/lib/integrations/types";

interface GoogleCalendarList {
  id: string;
  summary: string;
  selected?: boolean;
}

interface GoogleEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
}

const CALENDAR_LIST_URL = "https://www.googleapis.com/calendar/v3/users/me/calendarList";
const EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

export async function listCalendars(accessToken: string): Promise<GoogleCalendarList[]> {
  const response = await fetch(`${CALENDAR_LIST_URL}?maxResults=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`CalendarList falló (${response.status})`);
  const body = (await response.json()) as { items?: GoogleCalendarList[] };
  return body.items ?? [];
}

export async function listUpcomingEvents(
  accessToken: string,
  calendarId: string,
  maxResults = 25,
): Promise<CalendarEventDraft[]> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });
  const response = await fetch(
    `${EVENTS_URL}/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error(`Eventos fallaron (${response.status})`);
  const body = (await response.json()) as { items?: GoogleEvent[] };

  return (body.items ?? []).map((event) => {
    const allDay = Boolean(event.start?.date);
    const startsAt = event.start?.dateTime ?? event.start?.date ?? new Date().toISOString();
    const endsAt = event.end
      ? (event.end.dateTime ?? event.end.date ?? null)
      : null;
    return {
      externalId: event.id,
      title: event.summary?.trim() || "(Sin título)",
      startsAt: new Date(startsAt).toISOString(),
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      allDay,
      location: event.location ?? null,
      externalUrl: event.htmlLink ?? null,
      calendarSourceExternalId: calendarId,
      calendarSourceName: calendarId,
    } satisfies CalendarEventDraft;
  });
}
