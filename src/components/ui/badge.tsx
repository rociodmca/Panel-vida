import type { TaskPriority } from "@/lib/types";

const priorityStyles: Record<TaskPriority, { label: string; className: string }> = {
  alta: {
    label: "Alta",
    className:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  },
  media: {
    label: "Media",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  },
  baja: {
    label: "Baja",
    className:
      "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, className } = priorityStyles[priority];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100 ${className}`}
    >
      {children}
    </span>
  );
}
