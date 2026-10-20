"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_TASKS } from "@/lib/demo/fixtures";
import type { Task, TaskPriority, TaskStatus } from "@/lib/types";

const DEMO_STORAGE_KEY = "panel-vida:demo-tasks";

export interface TaskInput {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  priority?: TaskPriority;
  label?: string | null;
}

function loadDemoTasks(): Task[] {
  if (typeof window === "undefined") return DEMO_TASKS;
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return DEMO_TASKS;
    const parsed = JSON.parse(raw) as Task[];
    return Array.isArray(parsed) ? parsed : DEMO_TASKS;
  } catch {
    return DEMO_TASKS;
  }
}

function saveDemoTasks(tasks: Task[]) {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Almacenamiento no disponible: los cambios solo viven en memoria.
  }
}

function newId(): string {
  return crypto.randomUUID();
}

export function useTasks() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        if (!cancelled) {
          setTasks(loadDemoTasks());
          setLoading(false);
        }
        return;
      }
      setError(null);
      const { data, error: queryError } = await supabase
        .from("tasks")
        .select("*")
        .neq("status", "archivada")
        .order("due_at", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (queryError) {
        setError("No se pudieron cargar tus tareas. Comprueba tu conexión.");
      } else {
        setTasks((data as Task[]) ?? []);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, refreshKey]);

  const mutateDemo = useCallback(
    (mutator: (current: Task[]) => Task[]) => {
      setTasks((current) => {
        const next = mutator(current);
        saveDemoTasks(next);
        return next;
      });
    },
    [],
  );

  const createTask = useCallback(
    async (input: TaskInput) => {
      const title = input.title.trim();
      if (!title) return { ok: false as const, error: "El título es obligatorio." };
      if (!supabase) {
        const now = new Date().toISOString();
        mutateDemo((current) => [
          {
            id: newId(),
            user_id: "demo-user",
            title,
            notes: input.notes?.trim() || null,
            due_at: input.due_at || null,
            priority: input.priority ?? "media",
            status: "pendiente" as TaskStatus,
            label: input.label?.trim() || null,
            source: "manual",
            completed_at: null,
            created_at: now,
            updated_at: now,
          },
          ...current,
        ]);
        return { ok: true as const };
      }
      const { error: insertError } = await supabase.from("tasks").insert({
        title,
        notes: input.notes?.trim() || null,
        due_at: input.due_at || null,
        priority: input.priority ?? "media",
        label: input.label?.trim() || null,
        source: "manual",
      });
      if (insertError) return { ok: false as const, error: "No se pudo crear la tarea." };
      await refresh();
      return { ok: true as const };
    },
    [mutateDemo, refresh, supabase],
  );

  const updateTask = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Task, "title" | "notes" | "due_at" | "priority" | "label" | "status">>,
    ) => {
      if (!supabase) {
        mutateDemo((current) =>
          current.map((task) =>
            task.id === id
              ? {
                  ...task,
                  ...patch,
                  updated_at: new Date().toISOString(),
                  ...(patch.status === "completada"
                    ? { completed_at: new Date().toISOString() }
                    : patch.status === "pendiente"
                      ? { completed_at: null }
                      : {}),
                }
              : task,
          ),
        );
        return { ok: true as const };
      }
      const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
      if (patch.status === "completada") payload.completed_at = new Date().toISOString();
      if (patch.status === "pendiente") payload.completed_at = null;
      const { error: updateError } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", id);
      if (updateError) return { ok: false as const, error: "No se pudo actualizar la tarea." };
      await refresh();
      return { ok: true as const };
    },
    [mutateDemo, refresh, supabase],
  );

  const setCompleted = useCallback(
    (id: string, completed: boolean) =>
      updateTask(id, { status: completed ? "completada" : "pendiente" }),
    [updateTask],
  );

  const archiveTask = useCallback(
    (id: string) => updateTask(id, { status: "archivada" }),
    [updateTask],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!supabase) {
        mutateDemo((current) => current.filter((task) => task.id !== id));
        return { ok: true as const };
      }
      const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
      if (deleteError) return { ok: false as const, error: "No se pudo eliminar la tarea." };
      await refresh();
      return { ok: true as const };
    },
    [mutateDemo, refresh, supabase],
  );

  const archivedTasks = useCallback(async (): Promise<Task[]> => {
    if (!supabase) {
      return loadDemoTasks().filter((task) => (task.status as TaskStatus) === "archivada");
    }
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("status", "archivada")
      .order("updated_at", { ascending: false });
    return (data as Task[]) ?? [];
  }, [supabase]);

  return {
    tasks,
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    setCompleted,
    archiveTask,
    deleteTask,
    archivedTasks,
  };
}
