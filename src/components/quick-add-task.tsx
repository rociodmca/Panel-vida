"use client";

import { useState } from "react";
import { useTasksContext } from "@/components/tasks-provider";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

const priorityOptions = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export function QuickAddTask() {
  const { createTask } = useTasksContext();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("media");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const due_at = dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : null;
    const result = await createTask({
      title,
      notes: notes || null,
      due_at,
      priority: priority as "baja" | "media" | "alta",
      label: label.trim() || null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setNotes("");
    setDueDate("");
    setPriority("media");
    setLabel("");
    setOpen(false);
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls="captura-rapida"
        className="shadow-sm"
      >
        <PlusIcon />
        Añadir tarea
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        id="captura-rapida"
        role="dialog"
        aria-modal="true"
        aria-labelledby="captura-rapida-titulo"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h2
          id="captura-rapida-titulo"
          className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Añadir tarea
        </h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <Field id="qa-title" label="Título">
            <Input
              id="qa-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={300}
              autoFocus
              placeholder="p. ej. Llamar al centro de salud"
            />
          </Field>
          <Field id="qa-notes" label="Notas (opcional)">
            <Textarea
              id="qa-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="qa-due" label="Fecha límite">
              <Input
                id="qa-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field id="qa-priority" label="Prioridad">
              <Select
                id="qa-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field id="qa-label" label="Etiqueta (opcional)" hint="p. ej. trabajo, casa, salud">
            <Input
              id="qa-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              placeholder="trabajo"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? "Guardando…" : "Guardar tarea"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
