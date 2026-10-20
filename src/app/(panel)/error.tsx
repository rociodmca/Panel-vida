"use client";

import { ErrorState } from "@/components/ui/states";

export default function PanelError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="No se pudo cargar esta sección"
      description="Ha ocurrido un problema. Si persiste, revisa la configuración del entorno o inténtalo de nuevo."
      onRetry={reset}
    />
  );
}
