"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { APP_URL, GOOGLE_LOGIN_EXTRA_SCOPES } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
}

export async function login(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Introduce correo y contraseña." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "No se pudo iniciar sesión. Comprueba el correo y la contraseña." };
  }
  revalidatePath("/", "layout");
  redirect("/hoy");
}

export async function register(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!email || !password) return { error: "Introduce correo y contraseña." };
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase no está configurado en este entorno." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || undefined } },
  });
  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Ya existe una cuenta con ese correo." };
    }
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect("/hoy");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?sesion=cerrada");
}

/**
 * Inicia sesión con Google usando el proveedor de Supabase.
 * Requiere activar el proveedor Google en Supabase (Authentication → Providers)
 * con el mismo cliente OAuth de Google Cloud que usa la app.
 */
export async function loginWithGoogle(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?error=supabase");

  const scopes = ["openid", "email", "profile", ...GOOGLE_LOGIN_EXTRA_SCOPES];

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // La URL de retorno es exactamente la del sitio: Supabase solo acepta
      // esa URL (o las que estén en su lista de redirecciones permitidas).
      // Si se añade una ruta, esa ruta debe estar permitida también.
      redirectTo: APP_URL,
      skipBrowserRedirect: true,
      scopes: scopes.join(" "),
    },
  });

  if (error || !data?.url) redirect("/login?error=google");
  redirect(data.url);
}
