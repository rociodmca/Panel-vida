import { formatDate, formatTime } from "@/lib/datetime";

export interface DigestData {
  displayName: string | null;
  localDate: Date;
  events: Array<{
    title: string;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    location: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    due_at: string | null;
    priority: string;
    status: string;
  }>;
  emails: Array<{
    sender_name: string | null;
    sender_email: string;
    subject: string;
    received_at: string;
    is_important: boolean;
  }>;
  /** false cuando ninguna integración ha aportado datos (para no presentar vacío como error). */
  integrationsAvailable: boolean;
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildDigest(data: DigestData): string {
  const lines: string[] = [];
  const quien = data.displayName ? `, ${data.displayName}` : "";
  lines.push(`Buenos días${quien}.`);
  lines.push(`Resumen del ${formatDate(data.localDate)}.`);
  lines.push("");

  lines.push("AGENDA DE HOY");
  if (data.events.length === 0) {
    lines.push("- No hay citas programadas para hoy.");
  } else {
    for (const event of data.events) {
      const hora = event.all_day
        ? "Todo el día"
        : formatTime(event.starts_at) + (event.ends_at ? `–${formatTime(event.ends_at)}` : "");
      const ubicacion = event.location ? ` · ${event.location}` : "";
      lines.push(`- ${hora} · ${event.title}${ubicacion}`);
    }
  }
  lines.push("");

  const prioritarias = data.tasks
    .filter((task) => task.status === "pendiente" && task.priority === "alta")
    .slice(0, 3);
  const vencidas = data.tasks.filter(
    (task) =>
      task.status === "pendiente" &&
      task.due_at &&
      new Date(task.due_at).getTime() < Date.now(),
  );

  lines.push("TAREAS PRIORITARIAS");
  if (prioritarias.length === 0) {
    lines.push("- Sin tareas de prioridad alta.");
  } else {
    for (const task of prioritarias) {
      const vence = task.due_at ? ` (vence ${formatDate(task.due_at)})` : "";
      lines.push(`- ${task.title}${vence}`);
    }
  }
  lines.push("");

  lines.push("TAREAS VENCIDAS");
  if (vencidas.length === 0) {
    lines.push("- Nada vencido. Buen trabajo.");
  } else {
    for (const task of vencidas) {
      lines.push(`- ${task.title} (venció ${formatDate(task.due_at!)})`);
    }
  }
  lines.push("");

  lines.push("MENSAJES DESTACADOS");
  if (!data.integrationsAvailable) {
    lines.push("- Conecta Google Calendar o Gmail en Ajustes para ver aquí tus mensajes.");
  } else if (data.emails.length === 0) {
    lines.push("- No hay mensajes recientes pendientes de revisar.");
  } else {
    for (const mail of data.emails.slice(0, 5)) {
      const remitente = mail.sender_name ?? mail.sender_email;
      const marca = mail.is_important ? " [importante]" : "";
      lines.push(`- ${remitente}: ${mail.subject}${marca} (${formatTime(mail.received_at)})`);
    }
  }
  lines.push("");
  lines.push("—");
  lines.push("Panel de vida · Este resumen se genera con tus datos privados y no se comparte con terceros.");

  return lines.join("\n");
}

export function buildDigestEmail(data: DigestData): DigestEmail {
  const text = buildDigest(data);
  const subject = `Resumen del ${formatDate(data.localDate)}`;
  const htmlBody = text
    .split("\n")
    .map((line) => `<p style="margin:0 0 8px">${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");
  const html = `<!doctype html><html lang="es"><body style="font-family:system-ui,sans-serif;color:#18181b;max-width:560px;margin:0 auto;padding:16px">${htmlBody}</body></html>`;
  return { subject, text, html };
}
