"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

type Phase = "enfoque" | "descanso";

const PHASE_MINUTES: Record<Phase, number> = { enfoque: 25, descanso: 5 };

function formatRemaining(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FocusTimer() {
  const [phase, setPhase] = useState<Phase>("enfoque");
  const [remaining, setRemaining] = useState(PHASE_MINUTES.enfoque * 60);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [task, setTask] = useState("");

  // Un tick por segundo; el cambio de fase ocurre en el callback, no en el cuerpo del efecto.
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(remaining - 1);
        return;
      }
      const nextPhase: Phase = phase === "enfoque" ? "descanso" : "enfoque";
      if (phase === "enfoque") setCycles((c) => c + 1);
      setPhase(nextPhase);
      setRemaining(PHASE_MINUTES[nextPhase] * 60);
      setRunning(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [running, remaining, phase]);

  // Título de pestaña con el tiempo restante mientras corre.
  useEffect(() => {
    if (!running) return;
    const previous = document.title;
    document.title = `${formatRemaining(remaining)} · ${phase} · Panel de vida`;
    return () => {
      document.title = previous;
    };
  }, [running, remaining, phase]);

  function reset() {
    setRunning(false);
    setPhase("enfoque");
    setRemaining(PHASE_MINUTES.enfoque * 60);
  }

  const total = PHASE_MINUTES[phase] * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;

  return (
    <div className="space-y-5">
      <FieldTask task={task} setTask={setTask} running={running} />

      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {phase === "enfoque" ? "Sesión de enfoque" : "Descanso"}
          </p>
          <p
            aria-live="polite"
            className="mt-0.5 text-5xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
          >
            {formatRemaining(remaining)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Ciclos hoy</p>
          <p className="mt-0.5 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {cycles}
          </p>
        </div>
      </div>

      <div
        role="progressbar"
        aria-label="Progreso de la fase"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            phase === "enfoque"
              ? "bg-teal-700 dark:bg-teal-400"
              : "bg-amber-600 dark:bg-amber-400"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setRunning((r) => !r)}>
          {running ? "Pausar" : "Empezar"}
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reiniciar
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            const nextPhase: Phase = phase === "enfoque" ? "descanso" : "enfoque";
            setPhase(nextPhase);
            setRemaining(PHASE_MINUTES[nextPhase] * 60);
            setRunning(false);
          }}
        >
          Cambiar a {phase === "enfoque" ? "descanso" : "enfoque"}
        </Button>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {phase === "enfoque"
          ? `${PHASE_MINUTES.enfoque} minutos de enfoque, después ${PHASE_MINUTES.descanso} de descanso.`
          : `${PHASE_MINUTES.descanso} minutos de descanso antes del siguiente ciclo.`}
      </p>
    </div>
  );
}

function FieldTask({
  task,
  setTask,
  running,
}: {
  task: string;
  setTask: (value: string) => void;
  running: boolean;
}) {
  return (
    <div>
      <label
        htmlFor="focus-task"
        className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
      >
        ¿En qué vas a trabajar?
      </label>
      <Input
        id="focus-task"
        value={task}
        onChange={(event) => setTask(event.target.value)}
        maxLength={200}
        placeholder="p. ej. Terminar el informe trimestral"
        disabled={running}
      />
    </div>
  );
}
