"use server";

import { markLocalDataStale, isOfflineMode } from "@/lib/offline";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline-queue";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import type { OSStatus } from "@/types";

async function getAuth() {
  await requireAuth();
  return createAdminClient();
}

export async function createServiceOrder(_prevState: unknown, formData: FormData) {
  await requireAuth();

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

  const osTypeRaw = (formData.get("os_type") as string) || "service";
  const osType = osTypeRaw === "delivery" ? "delivery" : "service";

  const osFields = {
    customer_id: customerId,
    title,
    description: (formData.get("description") as string)?.trim() || null,
    status: "awaiting" as OSStatus,
    os_type: osType,
    equipment: (formData.get("equipment") as string)?.trim() || null,
    serial_number: (formData.get("serial_number") as string)?.trim() || null,
    labor_cost: parseFloat(formData.get("labor_cost") as string) || 0,
    discount: parseFloat(formData.get("discount") as string) || 0,
    notes: (formData.get("notes") as string)?.trim() || null,
    estimated_at: (formData.get("estimated_at") as string) || null,
    ...(images.length > 0 ? { images } : {}),
  };

  // Itens (campos indexados item_description_0, item_quantity_0, etc.)
  const itemsCount = parseInt(formData.get("items_count") as string) || 0;
  const rawItems: Array<{ product_id: string | null; description: string; quantity: number; unit_price: number }> = [];
  for (let i = 0; i < itemsCount; i++) {
    const description = (formData.get(`item_description_${i}`) as string)?.trim();
    if (!description) continue;
    rawItems.push({
      product_id: (formData.get(`item_product_id_${i}`) as string) || null,
      description,
      quantity: parseInt(formData.get(`item_quantity_${i}`) as string) || 1,
      unit_price: parseFloat(formData.get(`item_unit_price_${i}`) as string) || 0,
    });
  }

  let newId: string;

  if (isOfflineMode()) {
    newId = offlineInsert("erp_service_orders", osFields);
    for (const item of rawItems) {
      offlineInsert("erp_service_order_items", { ...item, service_order_id: newId });
    }
  } else {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("erp_service_orders")
      .insert(osFields)
      .select("id")
      .single();
    if (error) return { error: error.message };
    newId = data.id;

    if (rawItems.length > 0) {
      await supabase.from("erp_service_order_items").insert(
        rawItems.map((item) => ({ ...item, service_order_id: newId }))
      );
    }
  }

  revalidatePath("/os");
  revalidateTag("service-orders");
  markLocalDataStale();
  redirect(`/os/${newId}`);
}

export async function updateOSStatus(id: string, status: OSStatus) {
  await requireAuth();
  const payload = { status, updated_at: new Date().toISOString() };

  if (isOfflineMode()) {
    offlineUpdate("erp_service_orders", id, payload);
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("erp_service_orders").update(payload).eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath(`/os/${id}`);
  revalidatePath("/os");
  revalidateTag("service-orders");
  markLocalDataStale();
  return { success: true };
}

export async function deleteServiceOrder(id: string) {
  await requireAuth();

  if (isOfflineMode()) {
    offlineDelete("erp_service_orders", id);
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("erp_service_orders").delete().eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/os");
  markLocalDataStale();
  redirect("/os");
}
