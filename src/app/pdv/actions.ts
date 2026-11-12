"use server";

import { markLocalDataStale, isOfflineMode } from "@/lib/offline";
import { offlineInsert, offlineUpdate, getLocalProductStock } from "@/lib/offline-queue";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

type SaleItem = { product_id: string; description: string; quantity: number; unit_price: number; subtotal: number };
type SalePayment = { method: string; amount: number };

// Baixa de estoque atômica. Usa o RPC decrement_stock (clamp em 0);
// se o RPC não existir no banco, cai para read-then-write.
async function decrementStockSafe(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  qty: number
) {
  const { error } = await supabase.rpc("decrement_stock", { p_product_id: productId, p_qty: qty });
  if (!error) return;
  // Fallback: RPC ausente ou falhou
  const { data: product } = await supabase.from("products").select("stock").eq("id", productId).single();
  if (product) {
    const newQty = Math.max(0, (product.stock ?? 0) - qty);
    await supabase.from("products").update({ stock: newQty }).eq("id", productId);
  }
}

export async function createSale(prevState: unknown, formData: FormData) {
  await requireAuth();

  const customerId = (formData.get("customer_id") as string) || null;
  const discount = parseFloat(formData.get("discount") as string) || 0;
  const itemsCount = parseInt(formData.get("items_count") as string) || 0;
  const paymentsCount = parseInt(formData.get("payments_count") as string) || 0;

  if (itemsCount === 0) return { error: "Adicione ao menos um produto." };
  if (paymentsCount === 0) return { error: "Informe ao menos uma forma de pagamento." };

  const items: SaleItem[] = [];
  for (let i = 0; i < itemsCount; i++) {
    const productId = formData.get(`item_product_id_${i}`) as string;
    const description = (formData.get(`item_description_${i}`) as string)?.trim();
    const quantity = parseInt(formData.get(`item_quantity_${i}`) as string) || 1;
    const unitPrice = parseFloat(formData.get(`item_unit_price_${i}`) as string) || 0;
    if (!description) continue;
    items.push({ product_id: productId, description, quantity, unit_price: unitPrice, subtotal: quantity * unitPrice });
  }

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal - discount;

  const payments: SalePayment[] = [];
  for (let i = 0; i < paymentsCount; i++) {
    const method = formData.get(`payment_method_${i}`) as string;
    const amount = parseFloat(formData.get(`payment_amount_${i}`) as string) || 0;
    if (!method || amount <= 0) continue;
    payments.push({ method, amount });
  }

  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(paidTotal - total) > 0.01) {
    return { error: `Valor pago (R$ ${paidTotal.toFixed(2)}) difere do total (R$ ${total.toFixed(2)}).` };
  }

  let saleId: string;

  if (isOfflineMode()) {
    // Número de venda temporário só para exibição local; o Supabase gera o real no sync
    const tempNumber = Math.floor(Date.now() / 1000) % 1000000;
    saleId = offlineInsert(
      "erp_pdv_sales",
      { customer_id: customerId, subtotal, discount, total, sale_number: tempNumber },
      ["sale_number"]
    );
    for (const item of items) {
      offlineInsert("erp_pdv_sale_items", { ...item, sale_id: saleId });
    }
    for (const p of payments) {
      offlineInsert("erp_pdv_sale_payments", { ...p, sale_id: saleId });
    }
    for (const item of items) {
      if (!item.product_id) continue;
      const current = getLocalProductStock(item.product_id);
      if (current !== null) {
        const newStock = Math.max(0, current - item.quantity);
        offlineUpdate("products", item.product_id, { stock: newStock });
      }
      offlineInsert("erp_stock_movements", {
        product_id: item.product_id,
        type: "out",
        quantity: item.quantity,
        reason: "PDV",
        reference: `Venda #${tempNumber}`,
      });
    }

    revalidatePath("/pdv");
    revalidatePath("/estoque");
    revalidateTag("sales");
    revalidateTag("dashboard");
    markLocalDataStale();
    redirect(`/pdv/${saleId}/recibo`);
  }

  const supabase = createAdminClient();

  // Insere a venda
  const { data: sale, error: saleError } = await supabase
    .from("erp_pdv_sales")
    .insert({ customer_id: customerId, subtotal, discount, total })
    .select("id, sale_number")
    .single();

  if (saleError) return { error: saleError.message };
  saleId = sale.id;

  // Insere itens e pagamentos; se falhar, remove a venda para não ficar órfã
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("erp_pdv_sale_items")
      .insert(items.map((item) => ({ ...item, sale_id: saleId })));
    if (itemsError) {
      await supabase.from("erp_pdv_sales").delete().eq("id", saleId);
      return { error: itemsError.message };
    }
  }

  if (payments.length > 0) {
    const { error: paymentsError } = await supabase
      .from("erp_pdv_sale_payments")
      .insert(payments.map((p) => ({ ...p, sale_id: saleId })));
    if (paymentsError) {
      await supabase.from("erp_pdv_sales").delete().eq("id", saleId);
      return { error: paymentsError.message };
    }
  }

  // Baixa de estoque atômica + registro de movimentação
  for (const item of items) {
    if (!item.product_id) continue;
    await decrementStockSafe(supabase, item.product_id, item.quantity);
    await supabase.from("erp_stock_movements").insert({
      product_id: item.product_id,
      type: "out",
      quantity: item.quantity,
      reason: "PDV",
      reference: `Venda #${sale.sale_number}`,
    });
  }

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  revalidateTag("sales");
  revalidateTag("dashboard");
  markLocalDataStale();
  redirect(`/pdv/${saleId}/recibo`);
}
