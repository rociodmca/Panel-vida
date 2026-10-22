import { redirect } from "next/navigation";

// La raíz lee los parámetros de la URL: se resuelve en cada visita.
export const instant = false;

/**
 * Raíz de la aplicación. El proveedor puede devolver aquí con un error
 * (por ejemplo, cuando Supabase rechaza la URL de redirección): se traslada al
 * formulario de acceso para que el motivo no se pierda por el camino.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    error_code?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["error", "error_code", "error_description"] as const) {
    const value = params[key];
    if (typeof value === "string" && value) query.set(key, value.slice(0, 200));
  }

  redirect(query.size > 0 ? `/login?${query.toString()}` : "/hoy");
}
