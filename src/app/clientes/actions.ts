"use server";

import { markLocalDataStale, isOfflineMode } from "@/lib/offline";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline-queue";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

async function getAuth() {
  await requireAuth();
  return createAdminClient();
}

function customerFields(formData: FormData) {
  return {
    name: (formData.get("name") as string)?.trim(),
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim().toLowerCase() || null,
    cpf_cnpj: (formData.get("cpf_cnpj") as string)?.trim() || null,
    address: (formData.get("address") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };
}

function revalidateCustomers(id?: string) {
  revalidatePath("/clientes");
  if (id) revalidatePath(`/clientes/${id}`);
  revalidateTag("customers");
  markLocalDataStale();
}

export async function createCustomer(formData: FormData) {
  await requireAuth();
  const fields = customerFields(formData);
  if (!fields.name) return { error: "Nome é obrigatório." };

  if (isOfflineMode()) {
    offlineInsert("erp_customers", fields);
    revalidateCustomers();
    return { success: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_customers").insert(fields);
  if (error) return { error: error.message };
  revalidateCustomers();
  return { success: true };
}

export async function updateCustomer(id: string, formData: FormData) {
  await requireAuth();
  const fields = customerFields(formData);
  if (!fields.name) return { error: "Nome é obrigatório." };
  const payload = { ...fields, updated_at: new Date().toISOString() };

  if (isOfflineMode()) {
    offlineUpdate("erp_customers", id, payload);
    revalidateCustomers(id);
    return { success: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_customers").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidateCustomers(id);
  return { success: true };
}

export async function deleteCustomer(id: string) {
  await requireAuth();

  if (isOfflineMode()) {
    offlineDelete("erp_customers", id);
    revalidateCustomers();
    return { success: true };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("erp_customers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateCustomers();
  return { success: true };
}
