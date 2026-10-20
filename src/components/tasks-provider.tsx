"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTasks, type TaskInput } from "@/hooks/use-tasks";
import type { Task } from "@/lib/types";

interface TasksContextValue {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createTask: (input: TaskInput) => Promise<{ ok: true } | { ok: false; error: string }>;
  updateTask: (
    id: string,
    patch: Partial<Pick<Task, "title" | "notes" | "due_at" | "priority" | "label" | "status">>,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  setCompleted: (id: string, completed: boolean) => Promise<{ ok: true } | { ok: false; error: string }>;
  archiveTask: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteTask: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const value = useTasks();
  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasksContext(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasksContext debe usarse dentro de TasksProvider");
  return ctx;
}
