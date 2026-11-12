"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

// ── Cargos ───────────────────────────────────────────────────────────────────

export async function createCargo(formData: FormData): Promise<{ error?: string }> {
  await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome do cargo é obrigatório." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_roles").insert({
    name,
    description: (formData.get("description") as string)?.trim() || null,
    is_active: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/funcionarios");
  return {};
}

export async function updateCargo(id: string, formData: FormData): Promise<{ error?: string }> {
  await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome do cargo é obrigatório." };

  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_roles").update({
    name,
    description: (formData.get("description") as string)?.trim() || null,
    is_active: formData.get("is_active") !== "false",
  }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/funcionarios");
  return {};
}

export async function deleteCargo(id: string): Promise<{ error?: string }> {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_roles").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/funcionarios");
  return {};
}

// ── Funcionários ─────────────────────────────────────────────────────────────

export async function createFuncionario(formData: FormData): Promise<{ error?: string }> {
  await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const roleIds = formData.getAll("role_ids") as string[];

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("erp_employees").insert({
    name,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    is_active: true,
  }).select("id").single();
  if (error) return { error: error.message };

  if (roleIds.length > 0) {
    const links = roleIds.map((role_id) => ({ employee_id: data.id, role_id }));
    const { error: linkError } = await supabase.from("erp_employee_roles").insert(links);
    if (linkError) return { error: linkError.message };
  }

  revalidatePath("/funcionarios");
  return {};
}

export async function updateFuncionario(id: string, formData: FormData): Promise<{ error?: string }> {
  await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const roleIds = formData.getAll("role_ids") as string[];

  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_employees").update({
    name,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    is_active: formData.get("is_active") !== "false",
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: error.message };

  // Repõe os cargos: delete todos + insere os selecionados
  await supabase.from("erp_employee_roles").delete().eq("employee_id", id);
  if (roleIds.length > 0) {
    const links = roleIds.map((role_id) => ({ employee_id: id, role_id }));
    const { error: linkError } = await supabase.from("erp_employee_roles").insert(links);
    if (linkError) return { error: linkError.message };
  }

  revalidatePath("/funcionarios");
  return {};
}

export async function deleteFuncionario(id: string): Promise<{ error?: string }> {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_employees").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/funcionarios");
  return {};
}

export async function toggleFuncionarioAtivo(id: string, is_active: boolean): Promise<{ error?: string }> {
  await requireAuth();
  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_employees").update({
    is_active,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/funcionarios");
  return {};
}
