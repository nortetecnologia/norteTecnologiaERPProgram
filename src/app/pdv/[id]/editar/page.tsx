import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { updateSale } from "../../actions";
import PDVEditForm from "./PDVEditForm";

export default async function PDVEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuth();

  const supabase = createAdminClient();

  const [
    { data: sale },
    { data: customers },
    { data: products },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from("erp_pdv_sales")
      .select("*, erp_pdv_sale_items(*), erp_pdv_sale_payments(*)")
      .eq("id", id)
      .single(),
    supabase.from("erp_customers").select("id, name").order("name"),
    supabase.from("products").select("id, name, price, sku, stock").eq("active", true).order("name"),
    supabase.from("payment_methods").select("name, label").eq("active", true).order("label"),
  ]);

  if (!sale) notFound();

  const action = updateSale.bind(null, id);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Editar Venda #{sale.sale_number}</h1>
          <a
            href={`/pdv/${id}/recibo`}
            className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-500 rounded-lg hover:border-gray-400 transition-colors"
          >
            ← Voltar
          </a>
        </div>
        <PDVEditForm
          serverAction={action}
          initialData={{
            customer_id: sale.customer_id ?? "",
            discount: sale.discount ?? 0,
            items: (sale.erp_pdv_sale_items ?? []).map((i: any) => ({
              product_id: i.product_id ?? "",
              description: i.description,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
            payments: (sale.erp_pdv_sale_payments ?? []).map((p: any) => ({
              method: p.method,
              amount: p.amount,
            })),
          }}
          customers={customers ?? []}
          products={products ?? []}
          paymentMethods={paymentMethods ?? []}
        />
      </div>
    </AppLayout>
  );
}
