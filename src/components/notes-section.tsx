"use client";

import { useActionState, useState, useTransition } from "react";
import { createNote, deleteNote, togglePinNote, type NoteActionState } from "@/app/actions/notes";
import { Button } from "@/components/ui/button";
import { FormError, FormSuccess, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/datetime";
import type { Note } from "@/lib/types";

export function NotesSection({
  notes,
  demoMode,
}: {
  notes: Note[];
  demoMode: boolean;
}) {
  const [state, action, pending] = useActionState(createNote, {} as NoteActionState);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    setConfirmDeleteId(null);
    startTransition(async () => {
      await deleteNote(id);
    });
  }

  return (
    <div className="space-y-5">
      <form action={action}>
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
        <label htmlFor="note-body" className="sr-only">
          Nueva nota
        </label>
        <Textarea
          id="note-body"
          name="body"
          rows={3}
          maxLength={5000}
          placeholder="Captura una idea, un recordatorio o lo que tengas en la cabeza…"
          disabled={pending || demoMode}
        />
        <div className="mt-2 flex justify-end">
          <Button type="submit" size="sm" disabled={pending || demoMode}>
            {pending ? "Guardando…" : "Guardar nota"}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState
          title="Sin notas"
          description="Anota aquí lo que no quieras olvidar: ideas, enlaces, pensamientos sueltos."
        />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {notes.map((note) => (
            <li key={note.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {note.pinned && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-label="Fijada" className="mr-1 inline-block align-[-1px] text-teal-700 dark:text-teal-400">
                        <path d="M12 17l-5 5v-5H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8z" transform="rotate(180 12 12)" />
                      </svg>
                    )}
                    {note.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
                    {note.body}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDate(note.updated_at)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={isPending || demoMode}
                    onClick={() => startTransition(async () => {
                      await togglePinNote(note.id, !note.pinned);
                    })}
                    aria-label={note.pinned ? `Soltar ${note.title}` : `Fijar ${note.title}`}
                    className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 17l-5 5v-5H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8z" />
                    </svg>
                  </button>
                  {confirmDeleteId === note.id ? (
                    <span className="flex items-center gap-1">
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleDelete(note.id)}
                      >
                        Borrar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </Button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending || demoMode}
                      onClick={() => setConfirmDeleteId(note.id)}
                      aria-label={`Eliminar ${note.title}`}
                      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 dark:hover:bg-zinc-800 dark:hover:text-red-300"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {demoMode && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          En modo demo no hay cuenta real: las notas no se guardan.
        </p>
      )}
    </div>
  );
}
