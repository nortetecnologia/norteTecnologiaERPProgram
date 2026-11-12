"use server";

import { markLocalDataStale, isOfflineMode } from "@/lib/offline";
import { offlineInsert, offlineUpdate, offlineDelete } from "@/lib/offline-queue";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

async function getAuth() {
  await requireAuth();
  return createAdminClient();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function saveProduto(prevState: unknown, formData: FormData) {
  await requireAuth();

  const id = formData.get("id") as string | null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const imageUrl = (formData.get("primary_image_url") as string)?.trim() ?? null;

  const payload: Record<string, unknown> = {
    name,
    sku: (formData.get("sku") as string)?.trim() || null,
    price: parseFloat(formData.get("price") as string) || 0,
    stock: parseInt(formData.get("stock") as string) || 0,
    category_id: (formData.get("category_id") as string) || null,
    description: (formData.get("description") as string)?.trim() || null,
    is_active: formData.get("is_active") === "true",
  };

  if (isOfflineMode()) {
    let productId = id;
    if (id) {
      offlineUpdate("products", id, payload);
    } else {
      productId = offlineInsert("products", {
        ...payload,
        product_type: "product",
        slug: slugify(name) + "-" + Date.now(),
      });
    }
    // Offline: adiciona imagem nova (edição de imagem existente é resolvida no próximo sync)
    if (imageUrl && productId) {
      offlineInsert("product_images", {
        product_id: productId,
        url: imageUrl,
        alt: name,
        is_primary: true,
        position: 0,
      });
    }
    revalidatePath("/produtos");
    revalidatePath("/pdv");
    revalidateTag("products");
    markLocalDataStale();
    redirect("/produtos");
  }

  const supabase = createAdminClient();
  let productId = id;

  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    payload.slug = slugify(name) + "-" + Date.now();
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) return { error: error.message };
    productId = data.id;
  }

  // Save image to product_images table
  if (imageUrl !== null && productId) {
    if (imageUrl) {
      await supabase.from("product_images").delete().eq("product_id", productId).eq("is_primary", true);
      await supabase.from("product_images").insert({
        product_id: productId,
        url: imageUrl,
        alt: name,
        is_primary: true,
        position: 0,
      });
    } else {
      await supabase.from("product_images").delete().eq("product_id", productId).eq("is_primary", true);
    }
  }

  revalidatePath("/produtos");
  revalidatePath("/pdv");
  revalidateTag("products");
  markLocalDataStale();
  redirect("/produtos");
}

export async function deleteProduto(id: string) {
  await requireAuth();

  if (isOfflineMode()) {
    offlineDelete("products", id);
  } else {
    const supabase = createAdminClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return { error: error.message };
  }

  revalidatePath("/produtos");
  revalidateTag("products");
  markLocalDataStale();
  redirect("/produtos");
}

// ── Modal actions (sem redirect) ────────────────────────────────────────────

function buildProductPayload(formData: FormData, name: string): Record<string, unknown> {
  return {
    name,
    sku: (formData.get("sku") as string)?.trim() || null,
    brand: (formData.get("brand") as string)?.trim() || null,
    barcode: (formData.get("barcode") as string)?.trim() || null,
    internal_code: (formData.get("internal_code") as string)?.trim() || null,
    price: parseFloat(formData.get("price") as string) || 0,
    price_max: parseFloat(formData.get("price_max") as string) || null,
    stock: parseInt(formData.get("stock") as string) || 0,
    category_id: (formData.get("category_id") as string) || null,
    subcategory_id: (formData.get("subcategory_id") as string) || null,
    description: (formData.get("description") as string)?.trim() || null,
    product_type: ((formData.get("product_type") as string) || "product") as "product" | "service",
    is_active: formData.get("is_active") !== "false",
  };
}

async function saveImage(supabase: ReturnType<typeof createAdminClient>, productId: string, imageUrl: string | null, name: string) {
  if (imageUrl === null) return;
  await supabase.from("product_images").delete().eq("product_id", productId).eq("is_primary", true);
  if (imageUrl) {
    await supabase.from("product_images").insert({
      product_id: productId,
      url: imageUrl,
      alt: name,
      is_primary: true,
      position: 0,
    });
  }
}

export async function createProduto(formData: FormData): Promise<{ error?: string }> {
  await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const imageUrl = (formData.get("image_url") as string)?.trim() || null;
  const payload = buildProductPayload(formData, name);
  payload.slug = slugify(name) + "-" + Date.now();

  if (isOfflineMode()) {
    const productId = offlineInsert("products", payload);
    if (imageUrl && productId) {
      offlineInsert("product_images", {
        product_id: productId,
        url: imageUrl,
        alt: name,
        is_primary: true,
        position: 0,
      });
    }
    revalidatePath("/produtos");
    revalidatePath("/pdv");
    revalidateTag("products");
    markLocalDataStale();
    return {};
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").insert(payload).select("id").single();
  if (error) return { error: error.message };

  if (imageUrl !== null) {
    await saveImage(supabase, data.id, imageUrl, name);
  }

  revalidatePath("/produtos");
  revalidatePath("/pdv");
  revalidateTag("products");
  markLocalDataStale();
  return {};
}

export async function updateProduto(id: string, formData: FormData): Promise<{ error?: string }> {
  await requireAuth();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const imageUrl = (formData.get("image_url") as string)?.trim() ?? null;
  const payload = buildProductPayload(formData, name);

  if (isOfflineMode()) {
    offlineUpdate("products", id, payload);
    if (imageUrl !== undefined) {
      offlineInsert("product_images", {
        product_id: id,
        url: imageUrl,
        alt: name,
        is_primary: true,
        position: 0,
      });
    }
    revalidatePath("/produtos");
    revalidatePath("/pdv");
    revalidateTag("products");
    markLocalDataStale();
    return {};
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update(payload).eq("id", id);
  if (error) return { error: error.message };

  if (imageUrl !== null) {
    await saveImage(supabase, id, imageUrl || null, name);
  }

  revalidatePath("/produtos");
  revalidatePath("/pdv");
  revalidateTag("products");
  markLocalDataStale();
  return {};
}

export async function toggleProdutoAtivo(id: string, is_active: boolean): Promise<{ error?: string }> {
  await requireAuth();

  if (isOfflineMode()) {
    offlineUpdate("products", id, { is_active });
    revalidatePath("/produtos");
    revalidateTag("products");
    markLocalDataStale();
    return {};
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/produtos");
  revalidateTag("products");
  markLocalDataStale();
  return {};
}
