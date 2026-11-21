"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

type SaleItem = { product_id: string; description: string; quantity: number; unit_price: number; subtotal: number };

export async function updateQuoteAction(prevState: unknown, formData: FormData) {
  await requireAuth();

  const id = formData.get("quote_id") as string;
  const customerId = (formData.get("customer_id") as string) || null;
  const customerName = (formData.get("customer_name") as string)?.trim() || null;
  const discount = parseFloat(formData.get("discount") as string) || 0;
  const itemsCount = parseInt(formData.get("items_count") as string) || 0;

  if (!id) return { error: "ID do orçamento inválido." };
  if (itemsCount === 0) return { error: "Adicione ao menos um produto." };

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
  const total = Math.max(0, subtotal - discount);

  const supabase = createAdminClient();

  const { error: updateError } = await supabase
    .from("erp_pdv_sales")
    .update({ customer_id: customerId, customer_name: customerName, discount, total })
    .eq("id", id)
    .eq("type", "quote");

  if (updateError) return { error: updateError.message };

  // Replace items
  await supabase.from("erp_pdv_sale_items").delete().eq("sale_id", id);
  if (items.length > 0) {
    await supabase.from("erp_pdv_sale_items").insert(
      items.map((item) => ({ sale_id: id, ...item }))
    );
  }

  revalidatePath(`/pdv/orcamentos/${id}`);
  revalidatePath("/pdv/orcamentos");
  redirect(`/pdv/orcamentos/${id}`);
}
