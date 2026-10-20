import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { getUpcomingEvents } from "@/lib/data/dashboard";
import { formatDate, formatMonthDay, formatTime, formatWeekday, isToday } from "@/lib/datetime";
import type { CalendarEvent } from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agenda" };
// Datos por usuario y hora actual: se renderiza en cada petición.
export const instant = false;

function dayKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export default async function AgendaPage() {
  await connection();
  const events = await getUpcomingEvents(25);

  const now = new Date();
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = events.filter((event) => new Date(event.starts_at) <= inSevenDays);

  const byDay = new Map<string, CalendarEvent[]>();
  for (const event of upcoming) {
    const key = dayKey(event.starts_at);
    const list = byDay.get(key) ?? [];
    list.push(event);
    byDay.set(key, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Agenda
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Próximos 7 días · fechas en formato local dd/mm/aaaa
        </p>
      </header>

      {byDay.size === 0 ? (
        <EmptyState
          title="No hay eventos próximos"
          description="Sincroniza Google Calendar desde Ajustes o consulta la demostración."
        />
      ) : (
        [...byDay.entries()].map(([key, dayEvents]) => (
          <Card key={key} title={formatMonthDay(dayEvents[0].starts_at)}>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {dayEvents.map((event) => (
                <li key={event.id} className="flex gap-3 py-3 text-sm">
                  <div className="w-24 shrink-0">
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      {isToday(event.starts_at) ? "Hoy" : formatWeekday(event.starts_at)}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(event.starts_at)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {event.title}
                      {event.all_day && (
                        <span className="ml-2 text-xs text-zinc-500">todo el día</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {!event.all_day && (
                        <>
                          {formatTime(event.starts_at)}
                          {event.ends_at ? `–${formatTime(event.ends_at)}` : ""} ·{" "}
                        </>
                      )}
                      {event.calendar_name}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                  {event.external_url && (
                    <a
                      href={event.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 self-center text-sm font-medium text-teal-800 underline dark:text-teal-200"
                    >
                      Abrir
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
