"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const term = q.trim();
        router.push(term ? `/buscar?q=${encodeURIComponent(term)}` : "/buscar");
      }}
      className="flex gap-2"
    >
      <label htmlFor="search-input" className="sr-only">
        Buscar en tareas, notas, eventos y correos
      </label>
      <Input
        id="search-input"
        type="search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Busca en tareas, notas, eventos y correos…"
        minLength={2}
        maxLength={100}
        autoComplete="off"
      />
      <Button type="submit" disabled={q.trim().length < 2}>
        Buscar
      </Button>
    </form>
  );
}
