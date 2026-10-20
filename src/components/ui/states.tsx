export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Algo ha fallado",
  description = "No se pudieron cargar los datos. Inténtalo de nuevo en unos segundos.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center dark:border-red-900 dark:bg-red-950"
    >
      <p className="text-sm font-medium text-red-900 dark:text-red-100">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-red-800 dark:text-red-200">
        {description}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-900"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div role="status" className="space-y-3" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
