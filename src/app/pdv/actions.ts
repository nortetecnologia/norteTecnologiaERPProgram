"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

async function getAuth() {
  await requireAuth();
  return createAdminClient();
}

export async function createSale(prevState: unknown, formData: FormData) {
  const supabase = await getAuth();

  const customerId = (formData.get("customer_id") as string) || null;
  const discount = parseFloat(formData.get("discount") as string) || 0;
  const itemsCount = parseInt(formData.get("items_count") as string) || 0;
  const paymentsCount = parseInt(formData.get("payments_count") as string) || 0;

  if (itemsCount === 0) return { error: "Adicione ao menos um produto." };
  if (paymentsCount === 0) return { error: "Informe ao menos uma forma de pagamento." };

  // Build items list
  const items: { product_id: string; description: string; quantity: number; unit_price: number; subtotal: number }[] = [];
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

  // Build payments list
  const payments: { method: string; amount: number }[] = [];
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

  // Insert sale
  const { data: sale, error: saleError } = await supabase
    .from("erp_pdv_sales")
    .insert({
      customer_id: customerId || null,
      subtotal,
      discount,
      total,
    })
    .select("id, sale_number")
    .single();

  if (saleError) return { error: saleError.message };

  // Insert items
  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("erp_pdv_sale_items").insert(
      items.map((item) => ({ ...item, sale_id: sale.id }))
    );
    if (itemsError) return { error: itemsError.message };
  }

  // Insert payments
  if (payments.length > 0) {
    const { error: paymentsError } = await supabase.from("erp_pdv_sale_payments").insert(
      payments.map((p) => ({ ...p, sale_id: sale.id }))
    );
    if (paymentsError) return { error: paymentsError.message };
  }

  // Reduce stock for products with IDs
  for (const item of items) {
    if (!item.product_id) continue;
    // Decrement stock in products table
    const { data: product } = await supabase
      .from("products")
      .select("stock")
      .eq("id", item.product_id)
      .single();

    if (product) {
      const newQty = Math.max(0, (product.stock ?? 0) - item.quantity);
      await supabase
        .from("products")
        .update({ stock: newQty })
        .eq("id", item.product_id);

      // Register stock movement
      await supabase.from("erp_stock_movements").insert({
        product_id: item.product_id,
        type: "out",
        quantity: item.quantity,
        reason: "PDV",
        reference: `Venda #${sale.sale_number}`,
      });
    }
  }

  revalidatePath("/pdv");
  revalidatePath("/estoque");
  redirect(`/pdv/${sale.id}/recibo`);
}
