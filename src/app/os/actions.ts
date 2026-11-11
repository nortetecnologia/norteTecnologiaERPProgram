"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import type { OSStatus } from "@/types";

async function getAuth() {
  await requireAuth();
  return createAdminClient();
}

export async function createServiceOrder(_prevState: unknown, formData: FormData) {
  const supabase = await getAuth();

  const customerId = formData.get("customer_id") as string;
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Título/problema é obrigatório." };
  if (!customerId) return { error: "Selecione um cliente." };

  const imagesCount = parseInt(formData.get("images_count") as string) || 0;
  const images: string[] = [];
  for (let i = 0; i < imagesCount; i++) {
    const url = (formData.get(`image_url_${i}`) as string)?.trim();
    if (url) images.push(url);
  }

  const { data, error } = await supabase
    .from("erp_service_orders")
    .insert({
      customer_id: customerId,
      title,
      description: (formData.get("description") as string)?.trim() || null,
      status: "awaiting" as OSStatus,
      equipment: (formData.get("equipment") as string)?.trim() || null,
      serial_number: (formData.get("serial_number") as string)?.trim() || null,
      labor_cost: parseFloat(formData.get("labor_cost") as string) || 0,
      discount: parseFloat(formData.get("discount") as string) || 0,
      notes: (formData.get("notes") as string)?.trim() || null,
      estimated_at: (formData.get("estimated_at") as string) || null,
      ...(images.length > 0 ? { images } : {}),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Adicionar itens (lidos como campos indexados item_description_0, item_quantity_0, etc.)
  const itemsCount = parseInt(formData.get("items_count") as string) || 0;
  const itemsToInsert = [];
  for (let i = 0; i < itemsCount; i++) {
    const description = (formData.get(`item_description_${i}`) as string)?.trim();
    if (!description) continue;
    itemsToInsert.push({
      service_order_id: data.id,
      product_id: (formData.get(`item_product_id_${i}`) as string) || null,
      description,
      quantity: parseInt(formData.get(`item_quantity_${i}`) as string) || 1,
      unit_price: parseFloat(formData.get(`item_unit_price_${i}`) as string) || 0,
    });
  }
  if (itemsToInsert.length > 0) {
    await supabase.from("erp_service_order_items").insert(itemsToInsert);
  }

  revalidatePath("/os");
  redirect(`/os/${data.id}`);
}

export async function updateOSStatus(id: string, status: OSStatus) {
  const supabase = await getAuth();
  const { error } = await supabase
    .from("erp_service_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/os/${id}`);
  revalidatePath("/os");
  return { success: true };
}

export async function deleteServiceOrder(id: string) {
  const supabase = await getAuth();
  const { error } = await supabase
    .from("erp_service_orders")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/os");
  redirect("/os");
}
