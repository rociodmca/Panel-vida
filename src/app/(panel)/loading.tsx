import { LoadingState } from "@/components/ui/states";

export default function PanelLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <LoadingState label="Cargando el panel…" />
    </div>
  );
}
