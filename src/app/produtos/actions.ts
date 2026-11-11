"use server";

import { revalidatePath } from "next/cache";
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
  const supabase = await getAuth();

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
  redirect("/produtos");
}

export async function deleteProduto(id: string) {
  const supabase = await getAuth();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/produtos");
  redirect("/produtos");
}
