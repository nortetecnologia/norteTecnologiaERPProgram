"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePasswordAction(formData: FormData) {
  const code = (formData.get("code") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!code) redirect("/esqueci-senha?error=invalid");

  // Valida senha ANTES de consumir o code
  if (!password || password.length < 6) {
    redirect(`/redefinir-senha?code=${encodeURIComponent(code)}&error=weak`);
  }
  if (password !== confirm) {
    redirect(`/redefinir-senha?code=${encodeURIComponent(code)}&error=mismatch`);
  }

  const supabase = await createClient();

  // Troca o code por uma sessão
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) redirect("/esqueci-senha?error=expired");

  // Atualiza a senha
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) redirect("/login?reset=error");

  // Encerra a sessão e redireciona para o login
  await supabase.auth.signOut();
  redirect("/login?reset=done");
}
