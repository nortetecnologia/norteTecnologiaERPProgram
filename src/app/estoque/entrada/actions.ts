"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { isOfflineMode, markLocalDataStale } from "@/lib/offline";
import { offlineInsert, offlineUpdate, getLocalProductStock } from "@/lib/offline-queue";

export async function processEntrada(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  await requireAuth();

  const fornecedor = (formData.get("fornecedor") as string)?.trim() || null;
  const referencia = (formData.get("referencia") as string)?.trim() || null;
  const itemsCount = parseInt(formData.get("items_count") as string) || 0;

  if (itemsCount === 0) return { error: "Adicione ao menos um produto." };

  type EntradaItem = {
    product_id: string;
    quantity: number;
    unit_cost: number;
  };

  const items: EntradaItem[] = [];
  for (let i = 0; i < itemsCount; i++) {
    const productId = (formData.get(`item_product_id_${i}`) as string)?.trim();
    const quantity = parseInt(formData.get(`item_quantity_${i}`) as string) || 0;
    const unitCost = parseFloat(formData.get(`item_unit_cost_${i}`) as string) || 0;
    if (!productId || quantity <= 0) continue;
    items.push({ product_id: productId, quantity, unit_cost: unitCost });
  }

  if (items.length === 0) return { error: "Nenhum item válido encontrado." };

  const reason = fornecedor ? `Entrada — ${fornecedor}` : "Entrada de mercadoria";
  const ref = referencia ?? undefined;

  if (isOfflineMode()) {
    for (const item of items) {
      const current = getLocalProductStock(item.product_id);
      if (current === null) continue;
      offlineUpdate("products", item.product_id, {
        stock: current + item.quantity,
        updated_at: new Date().toISOString(),
      });
      offlineInsert("erp_stock_movements", {
        product_id: item.product_id,
        type: "in",
        quantity: item.quantity,
        reason,
        reference: ref,
      });
    }
    revalidatePath("/estoque");
    revalidatePath("/produtos");
    revalidateTag("products");
    revalidateTag("stock-movements");
    markLocalDataStale();
    redirect("/estoque");
  }

  const supabase = createAdminClient();

  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();

    if (!product) continue;

    const newStock = (product.stock ?? 0) + item.quantity;

    await supabase
      .from("products")
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq("id", item.product_id);

    await supabase.from("erp_stock_movements").insert({
      product_id: item.product_id,
      type: "in",
      quantity: item.quantity,
      reason,
      reference: ref,
    });
  }

  revalidatePath("/estoque");
  revalidatePath("/produtos");
  revalidateTag("products");
  revalidateTag("stock-movements");
  markLocalDataStale();
  redirect("/estoque");
}
