"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, FormError } from "@/components/ui/form";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action}>
      {state.error && <FormError message={state.error} />}
      <Field id="email" label="Correo electrónico">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@correo.com"
        />
      </Field>
      <Field id="password" label="Contraseña">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>
      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-teal-800 underline dark:text-teal-200">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
