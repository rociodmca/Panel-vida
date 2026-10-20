"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/hoy", label: "Hoy", icon: SunIcon },
  { href: "/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/tareas", label: "Tareas", icon: CheckIcon },
  { href: "/ajustes", label: "Ajustes", icon: SettingsIcon },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Escritorio */}
      <nav
        aria-label="Principal"
        className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex"
      >
        <Link
          href="/hoy"
          className="mb-8 rounded-lg text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Panel de vida
        </Link>
        <ul className="flex flex-1 flex-col gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    active
                      ? "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Zona horaria: Europa/Madrid
        </p>
      </nav>

      {/* Móvil */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal-700 ${
                active
                  ? "text-teal-800 dark:text-teal-200"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
