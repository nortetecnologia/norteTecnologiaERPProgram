"use server";

import { markLocalDataStale, isOfflineMode } from "@/lib/offline";
import { offlineUpdate, offlineInsert, getLocalProductStock } from "@/lib/offline-queue";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

function computeStock(current: number, type: "in" | "out" | "adjustment", quantity: number): number {
  if (type === "in") return current + quantity;
  if (type === "out") return Math.max(0, current - quantity);
  return quantity; // adjustment = valor absoluto
}

type AdjustResult = { success?: boolean; productName?: string; newStock?: number; error?: string };

export async function adjustStock(prevState: unknown, formData: FormData): Promise<AdjustResult> {
  await requireAuth();

  const productId = formData.get("product_id") as string;
  const type = formData.get("type") as "in" | "out" | "adjustment";
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const reason = (formData.get("reason") as string)?.trim() || "";
  const reasonLabel = reason || (type === "in" ? "Entrada manual" : type === "out" ? "Saída manual" : "Ajuste");

  if (!productId) return { error: "Selecione um produto." };
  if (quantity <= 0) return { error: "Quantidade deve ser maior que zero." };
  if (!type) return { error: "Tipo de movimentação inválido." };

  function finish(productName: string, newStock: number) {
    revalidatePath("/estoque");
    revalidatePath("/produtos");
    revalidateTag("products");
    revalidateTag("stock-movements");
    markLocalDataStale();
    return { success: true, productName, newStock };
  }

  if (isOfflineMode()) {
    const current = getLocalProductStock(productId);
    if (current === null) return { error: "Produto não encontrado no cache local." };
    const newStock = computeStock(current, type, quantity);
    offlineUpdate("products", productId, { stock: newStock, updated_at: new Date().toISOString() });
    offlineInsert("erp_stock_movements", { product_id: productId, type, quantity, reason: reasonLabel });
    return finish("Produto", newStock);
  }

  const supabase = createAdminClient();
  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("stock, name")
    .eq("id", productId)
    .single();

  if (fetchErr || !product) return { error: "Produto não encontrado." };

  const newStock = computeStock(product.stock ?? 0, type, quantity);

  const { error: updateErr } = await supabase
    .from("products")
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updateErr) return { error: updateErr.message };

  await supabase.from("erp_stock_movements").insert({
    product_id: productId,
    type,
    quantity,
    reason: reasonLabel,
  });

  return finish(product.name, newStock);
}
