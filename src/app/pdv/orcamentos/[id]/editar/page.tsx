import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { EditarOrcamentoClient } from "./EditarOrcamentoClient";
import { getCachedPDVProducts, getCachedCustomers, getCachedPaymentMethods, getCachedActiveEmployees } from "@/lib/queries";

const DEFAULT_PAYMENT_METHODS = [
  { name: "dinheiro", label: "Dinheiro" },
  { name: "pix", label: "PIX" },
  { name: "debito", label: "Cartão de Débito" },
  { name: "credito_1x", label: "Crédito 1x" },
];

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuth();

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("erp_pdv_sales")
    .select(
      "id, sale_number, total, discount, customer_id, customer_name, erp_pdv_sale_items(id, product_id, description, quantity, unit_price)"
    )
    .eq("id", id)
    .eq("type", "quote")
    .single();

  if (!quote) notFound();

  const [products, customers, paymentMethodsRaw, employees] = await Promise.all([
    getCachedPDVProducts(),
    getCachedCustomers(),
    getCachedPaymentMethods(),
    getCachedActiveEmployees(),
  ]);
  const paymentMethods = paymentMethodsRaw.length ? paymentMethodsRaw : DEFAULT_PAYMENT_METHODS;

  const q = quote as any;
  const items = (q.erp_pdv_sale_items ?? []).map((i: any) => ({
    product_id: i.product_id,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }));

  const num = `NT-${String(q.sale_number).padStart(5, "0")}`;

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Link href="/pdv" className="hover:text-brand-yellow transition-colors">PDV</Link>
          <span>›</span>
          <Link href="/pdv/orcamentos" className="hover:text-brand-yellow transition-colors">Orçamentos</Link>
          <span>›</span>
          <Link href={`/pdv/orcamentos/${id}`} className="hover:text-brand-yellow transition-colors">{num}</Link>
          <span>›</span>
          <span className="text-gray-300">Editar</span>
        </div>
        <EditarOrcamentoClient
          quoteId={id}
          initialItems={items}
          initialCustomerId={q.customer_id ?? ""}
          initialCustomerName={q.customer_name ?? ""}
          initialDiscount={q.discount ?? 0}
          products={products}
          customers={customers}
          paymentMethods={paymentMethods}
          employees={employees}
          quoteNumber={num}
        />
      </div>
    </AppLayout>
  );
}
