import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Nav } from "@/components/nav";
import { QuickAddTask } from "@/components/quick-add-task";
import { TasksProvider } from "@/components/tasks-provider";
import { isDemoMode } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await connection();
  if (!isDemoMode()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase!.auth.getUser();
    if (!data.user) redirect("/login");
  }

  return (
    <TasksProvider>
      <div className="min-h-dvh">
        <Nav />
        {isDemoMode() && (
          <div
            role="note"
            className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"
          >
            Modo demostración: los datos que ves son ficticios y las tareas se
            guardan solo en este navegador.{" "}
            <Link href="/login" className="font-medium underline">
              Inicia sesión
            </Link>{" "}
            para usar tu cuenta.
          </div>
        )}
        <div className="md:pl-56">
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:pb-12">
            {children}
          </main>
        </div>
        <div className="fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6">
          <QuickAddTask />
        </div>
      </div>
    </TasksProvider>
  );
}
