"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setUserERPRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ERPRole } from "@/lib/auth";

export async function setUserRoleAction(formData: FormData) {
  const { userId: callerId } = await requireAdmin();

  const targetId = (formData.get("user_id") as string)?.trim();
  const role = (formData.get("role") as string)?.trim() as ERPRole | "remove";

  if (!targetId) return;
  if (targetId === callerId) return; // cannot change own role

  if (role === "remove") {
    await setUserERPRole(targetId, null);
  } else if (role === "admin" || role === "operador") {
    await setUserERPRole(targetId, role);
  }

  revalidatePath("/configuracoes/usuarios");
}

type CreateUserState = { error: string; success?: undefined } | { success: boolean; error?: undefined } | null;

export async function createUserAction(_prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  await requireAdmin();

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string)?.trim();
  const role = (formData.get("role") as string)?.trim() as ERPRole;

  if (!email || !password) return { error: "Email e senha são obrigatórios." };
  if (password.length < 6) return { error: "Senha deve ter pelo menos 6 caracteres." };
  if (role !== "admin" && role !== "operador") return { error: "Papel inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { erp_role: role },
  });

  if (error) return { error: error.message };

  revalidatePath("/configuracoes/usuarios");
  return { success: true };
}

export async function deleteUserAction(formData: FormData) {
  const { userId: callerId } = await requireAdmin();

  const targetId = (formData.get("user_id") as string)?.trim();
  if (!targetId) return;
  if (targetId === callerId) return; // cannot delete yourself

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(targetId);
  if (error) throw new Error(error.message);

  revalidatePath("/configuracoes/usuarios");
}
