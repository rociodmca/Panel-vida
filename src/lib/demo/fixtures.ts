import type { CalendarEvent, EmailItem, Task } from "@/lib/types";

const DEMO_USER_ID = "demo-user";

function atHour(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: "persona.demo@example.com",
  display_name: "Persona de ejemplo",
};

export const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: "demo-ev-1",
    title: "Revisión médica",
    starts_at: atHour(0, 9, 30),
    ends_at: atHour(0, 10, 0),
    all_day: false,
    location: "Centro de salud",
    external_url: "https://calendar.google.com",
    calendar_name: "Personal",
  },
  {
    id: "demo-ev-2",
    title: "Reunión de seguimiento",
    starts_at: atHour(0, 12, 0),
    ends_at: atHour(0, 13, 0),
    all_day: false,
    location: "Videollamada",
    external_url: "https://calendar.google.com",
    calendar_name: "Trabajo",
  },
  {
    id: "demo-ev-3",
    title: "Recoger paquetería",
    starts_at: atHour(1, 17, 0),
    ends_at: null,
    all_day: false,
    location: "Punto de recogida",
    external_url: null,
    calendar_name: "Personal",
  },
  {
    id: "demo-ev-4",
    title: "Trámite de renovación",
    starts_at: atHour(3, 10, 0),
    ends_at: atHour(3, 11, 0),
    all_day: false,
    location: "Oficina de atención",
    external_url: null,
    calendar_name: "Gestiones",
  },
  {
    id: "demo-ev-5",
    title: "Viaje de fin de semana",
    starts_at: atHour(5, 8, 0),
    ends_at: atHour(6, 20, 0),
    all_day: true,
    location: null,
    external_url: null,
    calendar_name: "Personal",
  },
];

export const DEMO_EMAILS: EmailItem[] = [
  {
    id: "demo-em-1",
    sender_name: "Ayuntamiento",
    sender_email: "notificaciones@ayuntamiento.example",
    subject: "Recordatorio: cita para trámite municipal",
    received_at: atHour(0, 8, 12),
    is_unread: true,
    is_important: true,
    external_url: "https://mail.google.com",
  },
  {
    id: "demo-em-2",
    sender_name: "Compañía de seguros",
    sender_email: "avisos@seguros.example",
    subject: "Renovación de póliza pendiente de confirmación",
    received_at: atHour(0, 7, 45),
    is_unread: true,
    is_important: false,
    external_url: "https://mail.google.com",
  },
  {
    id: "demo-em-3",
    sender_name: "Biblioteca",
    sender_email: "biblioteca@example",
    subject: "Devolución próxima: «La sombra del viento»",
    received_at: atHour(1, 19, 3),
    is_unread: false,
    is_important: false,
    external_url: "https://mail.google.com",
  },
];

export const DEMO_TASKS: Task[] = [
  {
    id: "demo-task-1",
    user_id: DEMO_USER_ID,
    title: "Confirmar la revisión médica",
    notes: "Llamar por la mañana si no llega el SMS de confirmación.",
    due_at: atHour(0, 9, 0),
    priority: "alta",
    status: "pendiente",
    label: "Salud",
    source: "manual",
    completed_at: null,
    created_at: atHour(-2, 10, 0),
    updated_at: atHour(-2, 10, 0),
  },
  {
    id: "demo-task-2",
    user_id: DEMO_USER_ID,
    title: "Pagar el recibo del agua",
    notes: null,
    due_at: atHour(-1, 18, 0),
    priority: "media",
    status: "pendiente",
    label: "Hogar",
    source: "manual",
    completed_at: null,
    created_at: atHour(-5, 9, 0),
    updated_at: atHour(-5, 9, 0),
  },
  {
    id: "demo-task-3",
    user_id: DEMO_USER_ID,
    title: "Preparar documentos para la renovación",
    notes: "DNI en vigor y comprobante de empadronamiento.",
    due_at: atHour(2, 12, 0),
    priority: "alta",
    status: "pendiente",
    label: "Gestiones",
    source: "manual",
    completed_at: null,
    created_at: atHour(-1, 20, 0),
    updated_at: atHour(-1, 20, 0),
  },
  {
    id: "demo-task-4",
    user_id: DEMO_USER_ID,
    title: "Comprar billetes de tren",
    notes: null,
    due_at: atHour(3, 20, 0),
    priority: "baja",
    status: "pendiente",
    label: "Viajes",
    source: "manual",
    completed_at: null,
    created_at: atHour(-1, 20, 5),
    updated_at: atHour(-1, 20, 5),
  },
  {
    id: "demo-task-5",
    user_id: DEMO_USER_ID,
    title: "Enviar el informe semanal",
    notes: null,
    due_at: atHour(-3, 17, 0),
    priority: "media",
    status: "completada",
    label: "Trabajo",
    source: "manual",
    completed_at: atHour(-3, 16, 20),
    created_at: atHour(-4, 9, 0),
    updated_at: atHour(-3, 16, 20),
  },
];
