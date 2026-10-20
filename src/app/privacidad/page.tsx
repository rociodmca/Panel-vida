import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/hoy"
        className="text-sm font-medium text-teal-800 underline dark:text-teal-200"
      >
        ← Volver al panel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Privacidad y tratamiento de datos
      </h1>
      <div className="prose-sm mt-6 space-y-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Qué datos se tratan
          </h2>
          <p>
            Cuenta (correo, nombre), preferencias (zona horaria, hora y días del
            resumen), tareas que creas y, solo si tú lo conectas, metadatos de
            eventos de calendario y de mensajes de correo (remitente, asunto,
            fecha y etiquetas). No se guardan cuerpos de correo ni adjuntos.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Para qué se usan
          </h2>
          <p>
            Para mostrarte tu panel personal y, si lo activas, enviarte un
            resumen matinal por correo. No se usan para publicidad ni para
            entrenar modelos de terceros.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Proveedores
          </h2>
          <p>
            Supabase (base de datos y autenticación), Vercel (alojamiento) y,
            según conectes, Google (Calendar/Gmail) y un proveedor de correo
            transaccional para el resumen. Cada conexión se realiza con permisos
            mínimos y puedes revocarla desde Ajustes.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Retención
          </h2>
          <p>
            La caché de eventos y mensajes tiene caducidad automática (14 y 7
            días respectivamente). Los registros de envío del resumen se
            conservan solo como auditoría operativa.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Desconexión y borrado
          </h2>
          <p>
            Al desconectar una integración se revoca el token cuando el proveedor
            lo permite y se borran los datos importados asociados. Puedes eliminar
            tu cuenta y sus datos en cualquier momento; en el MVP el borrado
            completo se realiza eliminando la cuenta.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Aviso legal
          </h2>
          <p>
            Este texto es un borrador orientativo del producto y no sustituye una
            revisión legal conforme al RGPD y a la normativa española (AEPD)
            antes de un uso público con datos reales.
          </p>
        </section>
      </div>
    </main>
  );
}
