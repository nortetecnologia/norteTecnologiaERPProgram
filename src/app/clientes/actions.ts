"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

async function getAuth() {
  await requireAuth();
  return createAdminClient();
}

export async function createCustomer(formData: FormData) {
  const supabase = await getAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase.from("erp_customers").insert({
    name,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim().toLowerCase() || null,
    cpf_cnpj: (formData.get("cpf_cnpj") as string)?.trim() || null,
    address: (formData.get("address") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  });

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await getAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase
    .from("erp_customers")
    .update({
      name,
      phone: (formData.get("phone") as string)?.trim() || null,
      email: (formData.get("email") as string)?.trim().toLowerCase() || null,
      cpf_cnpj: (formData.get("cpf_cnpj") as string)?.trim() || null,
      address: (formData.get("address") as string)?.trim() || null,
      city: (formData.get("city") as string)?.trim() || null,
      notes: (formData.get("notes") as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true };
}

export async function deleteCustomer(id: string) {
  const supabase = await getAuth();
  const { error } = await supabase.from("erp_customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}
