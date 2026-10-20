"use client";

import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
    >
      {children}
    </label>
  );
}

const fieldClasses =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

export function Input({
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input id={id} className={`${fieldClasses} ${className}`} {...props} />;
}

export function Textarea({
  id,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea id={id} className={`${fieldClasses} min-h-20 ${className}`} {...props} />
  );
}

export function Select({
  id,
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select id={id} className={`${fieldClasses} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className="mb-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100"
    >
      {message}
    </p>
  );
}
