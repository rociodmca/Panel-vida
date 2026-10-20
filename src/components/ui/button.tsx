import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 focus-visible:outline-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 focus-visible:outline-zinc-500 dark:text-zinc-200 dark:hover:bg-zinc-800",
  danger:
    "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-red-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "min-h-8 px-2.5 text-sm",
  md: "min-h-10 px-4 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
