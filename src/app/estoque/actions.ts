"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function adjustStock(prevState: unknown, formData: FormData) {
  await requireAuth();
  const supabase = createAdminClient();

  const productId = formData.get("product_id") as string;
  const type = formData.get("type") as "in" | "out" | "adjustment";
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const reason = (formData.get("reason") as string)?.trim() || "";

  if (!productId) return { error: "Selecione um produto." };
  if (quantity <= 0) return { error: "Quantidade deve ser maior que zero." };
  if (!type) return { error: "Tipo de movimentação inválido." };

  const { data: product, error: fetchErr } = await supabase
    .from("products")
    .select("stock, name")
    .eq("id", productId)
    .single();

  if (fetchErr || !product) return { error: "Produto não encontrado." };

  let newStock = product.stock ?? 0;
  if (type === "in") newStock += quantity;
  else if (type === "out") newStock = Math.max(0, newStock - quantity);
  else newStock = quantity; // adjustment = set absolute value

  const { error: updateErr } = await supabase
    .from("products")
    .update({ stock: newStock, updated_at: new Date().toISOString() })
    .eq("id", productId);

  if (updateErr) return { error: updateErr.message };

  await supabase.from("erp_stock_movements").insert({
    product_id: productId,
    type,
    quantity,
    reason: reason || (type === "in" ? "Entrada manual" : type === "out" ? "Saída manual" : "Ajuste"),
  });

  revalidatePath("/estoque");
  revalidatePath("/produtos");
  return { success: true, productName: product.name, newStock };
}
