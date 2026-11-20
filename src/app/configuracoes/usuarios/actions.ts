"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { setUserERPRole } from "@/lib/auth";
import type { ERPRole } from "@/lib/auth";

export async function setUserRoleAction(formData: FormData) {
  await requireAdmin();

  const userId = (formData.get("user_id") as string)?.trim();
  const role = (formData.get("role") as string)?.trim() as ERPRole | "remove";

  if (!userId) return;

  if (role === "remove") {
    await setUserERPRole(userId, null);
  } else if (role === "admin" || role === "operador") {
    await setUserERPRole(userId, role);
  }

  revalidatePath("/configuracoes/usuarios");
}
