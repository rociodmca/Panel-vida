import Link from "next/link";
import { connection } from "next/server";
import { GymTracker } from "@/components/gym-tracker";
import { HabitsTracker } from "@/components/habits-tracker";
import { EmailSummaryButton } from "@/components/email-summary";
import { TasksSection } from "@/components/tasks-section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { getGymStatus, getTodayGymSets } from "@/lib/data/gym";
import { getHabitsStatus } from "@/lib/data/habits";
import { getRecentEmails, getUpcomingEvents } from "@/lib/data/dashboard";
import {
  currentGreeting,
  formatLongDate,
  formatTime,
  isToday,
} from "@/lib/datetime";
import { isDemoMode } from "@/lib/config";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hoy" };
export const instant = false;

export default async function HoyPage() {
  await connection();
  const [events, emails, gym, gymSets, habits] = await Promise.all([
    getUpcomingEvents(10),
    getRecentEmails(5),
    getGymStatus(),
    getTodayGymSets(),
    getHabitsStatus(),
  ]);
  const todayEvents = events.filter((event) => isToday(event.starts_at));
  const importantEmails = emails.filter((mail) => mail.is_important || mail.is_unread);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatLongDate(new Date())}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {currentGreeting()}
          {isDemoMode() && (
            <span className="ml-2 align-middle text-sm font-normal text-amber-700 dark:text-amber-400">
              (datos de ejemplo)
            </span>
          )}
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Citas hoy"
          value={String(todayEvents.length)}
          hint={todayEvents[0] ? `Primera: ${formatTime(todayEvents[0].starts_at)}` : "Libre"}
        />
        <SummaryCard
          label="Mensajes por revisar"
          value={String(importantEmails.length)}
          hint="El cuerpo no se guarda; se lee al resumir"
        />
        <SummaryCard
          label="Estado"
          value={isDemoMode() ? "Demo" : "Conectado"}
          hint={
            isDemoMode()
              ? "Sin servicios externos configurados"
              : "Cuenta activa con RLS"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Agenda de hoy"
          action={
            <Link
              href="/agenda"
              className="text-sm font-medium text-teal-800 underline hover:text-teal-900 dark:text-teal-200"
            >
              Ver 7 días
            </Link>
          }
        >
          {todayEvents.length === 0 ? (
            <EmptyState
              title="Sin citas hoy"
              description="Cuando sincronices tu calendario aparecerán aquí tus citas del día."
            />
          ) : (
            <ul className="space-y-3">
              {todayEvents.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span className="w-14 shrink-0 font-medium text-zinc-700 dark:text-zinc-300">
                    {event.all_day ? "Todo\ndía" : formatTime(event.starts_at)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {event.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {event.calendar_name}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Correo reciente"
          description="Remitente, asunto y un fragmento. El cuerpo se lee solo cuando pides un resumen."
        >
          {emails.length === 0 ? (
            <EmptyState
              title="Sin mensajes"
              description="Conecta Gmail en Ajustes para ver aquí lo reciente."
            />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {emails.map((mail) => (
                <li key={mail.id} className="py-2.5">
                  <div className="flex items-center gap-2">
                    {mail.is_important && <Badge>Importante</Badge>}
                    {mail.is_unread && (
                      <span className="text-xs font-medium text-teal-800 dark:text-teal-200">
                        No leído
                      </span>
                    )}
                    {mail.relevance_reason && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {mail.relevance_reason}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTime(mail.received_at)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {mail.external_url ? (
                      <a
                        href={mail.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {mail.subject}
                      </a>
                    ) : (
                      mail.subject
                    )}
                  </p>
                  {mail.snippet && (
                    <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {mail.snippet}
                    </p>
                  )}
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {mail.sender_name ?? mail.sender_email}
                    {mail.external_url && (
                      <a
                        href={mail.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 font-medium text-teal-800 underline dark:text-teal-200"
                      >
                        Abrir en Gmail
                      </a>
                    )}
                  </p>
                  {!isDemoMode() && mail.external_id && (
                    <EmailSummaryButton messageId={mail.external_id} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Tareas"
          description="Lo más urgente de hoy y lo que está vencido."
          action={
            <Link
              href="/tareas"
              className="text-sm font-medium text-teal-800 underline hover:text-teal-900 dark:text-teal-200"
            >
              Ver todas
            </Link>
          }
        >
          <TasksSection compact />
        </Card>

        <Card title="Gimnasio" description="Registro diario y racha de la semana.">
          <GymTracker status={gym} sets={gymSets} demoMode={isDemoMode()} />
        </Card>
      </div>

      <Card
        title="Hábitos de hoy"
        description="Márcalos al terminarlos; la racha se rompe si pierdes un día."
        action={
          <Link
            href="/bienestar"
            className="text-sm font-medium text-teal-800 underline hover:text-teal-900 dark:text-teal-200"
          >
            Gestionar en Bienestar
          </Link>
        }
      >
        <HabitsTracker status={habits} demoMode={isDemoMode()} />
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
    </div>
  );
}
