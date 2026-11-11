import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate, formatPhone, formatCPFCNPJ, formatOSNumber } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS } from "@/types";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const [
    { data: customer },
    { data: ordersRaw },
    { data: salesRaw },
  ] = await Promise.all([
    supabase.from("erp_customers").select("*").eq("id", id).single(),
    supabase
      .from("erp_service_orders")
      .select("id, number, title, status, created_at, labor_cost, discount, erp_service_order_items(quantity, unit_price)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("erp_pdv_sales")
      .select("id, sale_number, total, created_at, erp_pdv_sale_payments(method)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!customer) notFound();

  const orders = ordersRaw ?? [];
  const sales = salesRaw ?? [];

  const totalGastoOS = orders.reduce((sum: number, o: any) => {
    const items = (o.erp_service_order_items ?? []).reduce(
      (s: number, i: any) => s + i.quantity * i.unit_price, 0
    );
    return sum + items + (o.labor_cost ?? 0) - (o.discount ?? 0);
  }, 0);

  const totalGastoPDV = sales.reduce((s: number, v: any) => s + (v.total ?? 0), 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{customer.name}</h1>
            {customer.email && <p className="text-gray-400 text-sm mt-0.5">{customer.email}</p>}
          </div>
          <Link
            href={`/clientes/${id}/editar`}
            className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            Editar
          </Link>
        </div>

        {/* Info + Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-3">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Dados de contato</div>
            {customer.phone && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Telefone</span>
                <span className="text-white">{formatPhone(customer.phone)}</span>
              </div>
            )}
            {customer.cpf_cnpj && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">CPF/CNPJ</span>
                <span className="text-white">{formatCPFCNPJ(customer.cpf_cnpj)}</span>
              </div>
            )}
            {customer.city && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Cidade</span>
                <span className="text-white">{customer.city}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Endereço</span>
                <span className="text-white text-right max-w-[60%]">{customer.address}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Cliente desde</span>
              <span className="text-white">{formatDate(customer.created_at)}</span>
            </div>
          </div>

          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-brand-yellow">{orders.length}</div>
              <div className="text-xs text-gray-500 mt-1">Ordens de Serviço</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-brand-yellow">{sales.length}</div>
              <div className="text-xs text-gray-500 mt-1">Compras PDV</div>
            </div>
            <div className="text-center col-span-2 border-t border-brand-gray-mid pt-3">
              <div className="text-lg font-bold text-white">
                {formatCurrency(totalGastoOS + totalGastoPDV)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total gasto</div>
            </div>
          </div>
        </div>

        {customer.notes && (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-5">
            <div className="text-xs text-gray-500 mb-1">Observações</div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">{customer.notes}</div>
          </div>
        )}

        {/* OS history */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">Ordens de Serviço</h2>
            <Link
              href={`/os/nova?customer_id=${id}`}
              className="text-xs text-brand-yellow hover:text-brand-yellow-dark"
            >
              + Nova OS
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhuma OS registrada.</p>
          ) : (
            <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
              {(orders as any[]).map((os) => {
                const items = (os.erp_service_order_items ?? []).reduce(
                  (s: number, i: any) => s + i.quantity * i.unit_price, 0
                );
                const total = items + (os.labor_cost ?? 0) - (os.discount ?? 0);
                return (
                  <Link
                    key={os.id}
                    href={`/os/${os.id}`}
                    className="flex items-center gap-4 px-5 py-3 border-b border-brand-gray-mid last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <span className="font-mono text-xs text-brand-yellow w-20 shrink-0">
                      {formatOSNumber(os.number)}
                    </span>
                    <span className="flex-1 text-sm text-white truncate">{os.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${OS_STATUS_COLORS[os.status as keyof typeof OS_STATUS_COLORS]}`}>
                      {OS_STATUS_LABELS[os.status as keyof typeof OS_STATUS_LABELS]}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 hidden md:block">{formatDate(os.created_at)}</span>
                    {total > 0 && (
                      <span className="text-xs text-gray-300 shrink-0">{formatCurrency(total)}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* PDV sales history */}
        <div>
          <h2 className="text-base font-semibold text-white mb-3">Compras no PDV</h2>
          {sales.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">Nenhuma compra registrada.</p>
          ) : (
            <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
              {(sales as any[]).map((sale) => {
                const methods = (sale.erp_pdv_sale_payments ?? [])
                  .map((p: any) => p.method)
                  .join(", ");
                return (
                  <Link
                    key={sale.id}
                    href={`/pdv/${sale.id}/recibo`}
                    className="flex items-center gap-4 px-5 py-3 border-b border-brand-gray-mid last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <span className="font-mono text-xs text-gray-400 w-16 shrink-0">#{sale.sale_number}</span>
                    <span className="flex-1 text-xs text-gray-500">{methods}</span>
                    <span className="text-xs text-gray-400 shrink-0 hidden md:block">{formatDate(sale.created_at)}</span>
                    <span className="text-sm font-semibold text-white shrink-0">{formatCurrency(sale.total)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
