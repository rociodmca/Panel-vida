"use client";

import { useState } from "react";
import { PriorityBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useTasksContext } from "@/components/tasks-provider";
import { formatDate, isOverdue, isToday } from "@/lib/datetime";
import type { Task, TaskPriority } from "@/lib/types";

type Filter = "hoy" | "vencidas" | "pendientes" | "completadas";

const filterLabels: Record<Filter, string> = {
  hoy: "Hoy",
  vencidas: "Vencidas",
  pendientes: "Pendientes",
  completadas: "Completadas",
};

export function TasksSection({ compact = false }: { compact?: boolean }) {
  const { tasks, loading, error, refresh, setCompleted, archiveTask, updateTask } =
    useTasksContext();
  const [filter, setFilter] = useState<Filter>(compact ? "hoy" : "pendientes");
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading) return <LoadingTasks />;
  if (error) return <ErrorState description={error} onRetry={() => void refresh()} />;

  const filtered = tasks.filter((task) => {
    if (filter === "completadas") return task.status === "completada";
    if (task.status !== "pendiente") return false;
    if (filter === "vencidas") return isOverdue(task.due_at, task.status);
    if (filter === "hoy") {
      return task.due_at ? isToday(task.due_at) : false;
    }
    return true;
  });

  const overdueCount = tasks.filter((task) => isOverdue(task.due_at, task.status)).length;

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Filtrar tareas">
          {(Object.keys(filterLabels) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                filter === key
                  ? "bg-teal-700 text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {filterLabels[key]}
              {key === "vencidas" && overdueCount > 0 ? ` (${overdueCount})` : ""}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay tareas aquí"
          description="Usa «Añadir tarea» para capturar algo rápido con fecha y prioridad."
        />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              editing={editingId === task.id}
              onEdit={() => setEditingId(task.id)}
              onCancelEdit={() => setEditingId(null)}
              onToggle={(completed) => void setCompleted(task.id, completed)}
              onArchive={() => void archiveTask(task.id)}
              onSave={async (patch) => {
                await updateTask(task.id, patch);
                setEditingId(null);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LoadingTasks() {
  return (
    <div role="status" className="space-y-2" aria-live="polite">
      <span className="sr-only">Cargando tareas…</span>
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

function TaskRow({
  task,
  editing,
  onEdit,
  onCancelEdit,
  onToggle,
  onArchive,
  onSave,
}: {
  task: Task;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onToggle: (completed: boolean) => void;
  onArchive: () => void;
  onSave: (patch: Partial<Task>) => Promise<void>;
}) {
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(
    task.due_at ? task.due_at.slice(0, 10) : "",
  );
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const overdue = isOverdue(task.due_at, task.status);
  const completed = task.status === "completada";

  if (editing) {
    return (
      <li className="py-3">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave({
              title,
              due_at: dueDate ? new Date(`${dueDate}T09:00:00`).toISOString() : null,
              priority,
            });
          }}
        >
          <div className="flex-1">
            <label htmlFor={`edit-${task.id}`} className="sr-only">
              Título de la tarea
            </label>
            <Input
              id={`edit-${task.id}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={300}
            />
          </div>
          <div>
            <label htmlFor={`edit-date-${task.id}`} className="sr-only">
              Fecha límite
            </label>
            <Input
              id={`edit-date-${task.id}`}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`edit-priority-${task.id}`} className="sr-only">
              Prioridad
            </label>
            <Select
              id={`edit-priority-${task.id}`}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Guardar
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onCancelEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={completed}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Marcar «${task.title}» como ${completed ? "pendiente" : "completada"}`}
        className="mt-1 size-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-teal-700"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            completed
              ? "text-zinc-400 line-through dark:text-zinc-500"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {task.due_at ? `Vence ${formatDate(task.due_at)}` : "Sin fecha"}
          {overdue && (
            <span className="ml-1 font-medium text-red-700 dark:text-red-400">
              · vencida
            </span>
          )}
          {task.label ? ` · ${task.label}` : ""}
        </p>
      </div>
      <PriorityBadge priority={task.priority} />
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Editar
        </Button>
        {!completed && (
          <Button variant="ghost" size="sm" onClick={onArchive}>
            Archivar
          </Button>
        )}
      </div>
    </li>
  );
}
