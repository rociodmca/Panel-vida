"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input, FormError } from "@/components/ui/form";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, initialState);

  return (
    <form action={action}>
      {state.error && <FormError message={state.error} />}
      <Field id="display_name" label="Nombre (opcional)">
        <Input id="display_name" name="display_name" autoComplete="name" />
      </Field>
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
      <Field id="password" label="Contraseña" hint="Mínimo 8 caracteres.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
      <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-teal-800 underline dark:text-teal-200">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
