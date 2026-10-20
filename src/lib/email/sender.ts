import { EMAIL_API_KEY, EMAIL_FROM, EMAIL_PROVIDER } from "@/lib/config";

export interface OutgoingEmail {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Proveedor transaccional. En el MVP: Resend (o "log" para desarrollo,
 * que no envía nada real). El resumen NUNCA se envía desde el Gmail del usuario.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const from = email.from ?? EMAIL_FROM;

  if (EMAIL_PROVIDER === "log" || !EMAIL_API_KEY) {
    console.info(
      JSON.stringify({
        level: "info",
        msg: "digest_email_simulado",
        to: email.to,
        subject: email.subject,
      }),
    );
    return { ok: true, providerMessageId: "log-simulado" };
  }

  if (!from) {
    return { ok: false, error: "EMAIL_FROM no configurado" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${EMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        headers: email.headers,
      }),
    });
    if (!response.ok) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "digest_email_fallido",
          status: response.status,
        }),
      );
      return { ok: false, error: `Proveedor respondió ${response.status}` };
    }
    const body = (await response.json()) as { id?: string };
    return { ok: true, providerMessageId: body.id };
  } catch {
    console.error(JSON.stringify({ level: "error", msg: "digest_email_excepcion" }));
    return { ok: false, error: "Error de red con el proveedor de correo" };
  }
}
