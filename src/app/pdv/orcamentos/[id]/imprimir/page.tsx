import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { PrintLayout } from "@/components/pdv/PrintLayout";

export default async function OrcamentoImprimirPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type: typeParam } = await searchParams;
  const type = (typeParam === "thermal" ? "thermal" : "a4") as "a4" | "thermal";

  await requireAuth();

  const supabase = createAdminClient();

  const [{ data: quote }, { data: settings }] = await Promise.all([
    supabase
      .from("erp_pdv_sales")
      .select(
        "sale_number, total, discount, created_at, customer_name, customer_id, erp_customers(name, phone), erp_pdv_sale_items(description, quantity, unit_price)"
      )
      .eq("id", id)
      .eq("type", "quote")
      .single(),
    supabase.from("store_settings").select("store_name, phone_number, address, cnpj").limit(1).maybeSingle(),
  ]);

  if (!quote) notFound();

  const q = quote as any;
  const items: { description: string; quantity: number; unit_price: number }[] = q.erp_pdv_sale_items ?? [];
  const customerName = q.customer_name ?? q.erp_customers?.name ?? "Consumidor final";
  const customerPhone = q.erp_customers?.phone ?? undefined;
  const quoteNumber = `NT-${String(q.sale_number).padStart(5, "0")}`;
  const dateStr = new Date(q.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });

  const data = {
    quoteNumber,
    dateStr,
    customerName,
    customerPhone,
    items,
    discount: q.discount ?? 0,
    total: q.total ?? 0,
    storeName: settings?.store_name ?? undefined,
    storeAddress: settings?.address ?? undefined,
    cnpj: settings?.cnpj ?? undefined,
  };

  return <PrintLayout data={data} type={type} />;
}
