"use client";

import { useFormStatus } from "react-dom";
import { logout } from "@/app/actions/auth";

type Variant = "secondary" | "ghost" | "icon";

const variantClasses: Record<Variant, string> = {
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-500 dark:text-zinc-200 dark:hover:bg-zinc-800",
  icon:
    "text-zinc-600 hover:bg-zinc-100 focus-visible:outline-zinc-500 dark:text-zinc-300 dark:hover:bg-zinc-800",
};

const sizeClasses: Record<Variant, string> = {
  secondary: "min-h-10 px-4",
  ghost: "min-h-10 w-full justify-start px-3",
  icon: "min-h-10 w-10",
};

/**
 * Cierra la sesión de Supabase y vuelve al formulario de acceso.
 * `secondary`: botón con texto (Ajustes). `ghost`: fila de menú lateral.
 * `icon`: solo icono, para la cabecera móvil.
 */
export function LogoutButton({
  variant = "secondary",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    <form action={logout}>
      <LogoutSubmit variant={variant} className={className} />
    </form>
  );
}

function LogoutSubmit({
  variant,
  className,
}: {
  variant: Variant;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={variant === "icon" ? "Cerrar sesión" : undefined}
      title={variant === "icon" ? "Cerrar sesión" : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[variant]} ${className}`}
    >
      <LogOutIcon />
      {variant !== "icon" && <span>{pending ? "Cerrando…" : "Cerrar sesión"}</span>}
    </button>
  );
}

function LogOutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
