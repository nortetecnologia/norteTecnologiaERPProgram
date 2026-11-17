"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { extractRole } from "@/lib/auth";

export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) redirect("/esqueci-senha?error=invalid");

  const admin = createAdminClient();

  // Verifica se existe usuário com este e-mail e com acesso ao ERP
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) redirect("/esqueci-senha?error=server");

  const user = data.users.find((u) => u.email?.toLowerCase() === email);

  if (!user || !extractRole(user.app_metadata)) {
    redirect("/esqueci-senha?error=not_found");
  }

  // Envia e-mail de recuperação
  const supabase = await createClient();
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "http://localhost:3721/redefinir-senha",
  });

  if (resetError) redirect("/esqueci-senha?error=server");

  redirect("/esqueci-senha?sent=1");
}
