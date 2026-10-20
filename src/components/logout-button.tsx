"use client";

import { useActionState } from "react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [state, action, pending] = useActionState(async () => {
    await logout();
    return {};
  }, {});

  return (
    <form action={action}>
      <Button variant="secondary" type="submit" disabled={pending}>
        {pending ? "Cerrando…" : "Cerrar sesión"}
      </Button>
      {state && null}
    </form>
  );
}
