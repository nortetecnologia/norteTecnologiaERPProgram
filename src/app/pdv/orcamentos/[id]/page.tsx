import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { FecharVendaButton, DeleteQuoteButton, PrintQuoteButton } from "./OrcamentoActions";

export default async function OrcamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuth();

  const supabase = createAdminClient();
  const { data: quote } = await supabase
    .from("erp_pdv_sales")
    .select(
      "id, sale_number, total, discount, created_at, customer_id, customer_name, erp_customers(name, phone), erp_pdv_sale_items(id, product_id, description, quantity, unit_price, subtotal)"
    )
    .eq("id", id)
    .eq("type", "quote")
    .single();

  if (!quote) notFound();

  const q = quote as any;
  const items: { id: string; product_id: string; description: string; quantity: number; unit_price: number; subtotal: number }[] =
    q.erp_pdv_sale_items ?? [];
  const customerDisplay = q.customer_name ?? q.erp_customers?.name ?? "Consumidor final";
  const num = `NT-${String(q.sale_number).padStart(5, "0")}`;
  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const cartItems = items.map((i) => ({
    product_id: i.product_id,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }));

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Link href="/pdv" className="hover:text-brand-yellow transition-colors">PDV</Link>
          <span>›</span>
          <Link href="/pdv/orcamentos" className="hover:text-brand-yellow transition-colors">Orçamentos</Link>
          <span>›</span>
          <span className="text-gray-300">{num}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">{num}</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {formatDate(q.created_at)} · {customerDisplay}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FecharVendaButton
              cartItems={cartItems}
              customerId={q.customer_id ?? null}
              customerName={q.customer_name ?? null}
              discount={q.discount ?? 0}
            />
            <Link
              href={`/pdv/orcamentos/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 border border-brand-gray-mid text-gray-300 text-sm rounded-lg hover:border-gray-400 transition-colors"
            >
              ✏️ Editar
            </Link>
            <PrintQuoteButton quoteId={id} />
            <DeleteQuoteButton quoteId={id} />
          </div>
        </div>

        {/* Customer info */}
        {(q.erp_customers || q.customer_name) && (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-4">
            <div className="text-xs text-gray-500 mb-1">Cliente</div>
            <div className="text-sm text-white font-medium">{customerDisplay}</div>
            {q.erp_customers?.phone && (
              <div className="text-xs text-gray-400 mt-0.5">{q.erp_customers.phone}</div>
            )}
            {q.customer_id && (
              <Link href={`/clientes/${q.customer_id}`} className="text-xs text-brand-yellow hover:underline mt-1 inline-block">
                Ver cadastro →
              </Link>
            )}
          </div>
        )}

        {/* Items */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-4">
          <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
            Itens ({items.length})
          </div>
          {items.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-500 text-center">Nenhum item.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-5 py-2">Item</th>
                  <th className="text-right px-5 py-2">Qtd</th>
                  <th className="text-right px-5 py-2">Unit.</th>
                  <th className="text-right px-5 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-brand-gray-mid">
                    <td className="px-5 py-2.5 text-white">{item.description}</td>
                    <td className="px-5 py-2.5 text-right text-gray-300">{item.quantity}</td>
                    <td className="px-5 py-2.5 text-right text-gray-300">{formatCurrency(item.unit_price)}</td>
                    <td className="px-5 py-2.5 text-right text-white">{formatCurrency(item.quantity * item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Totals */}
          <div className="px-5 py-4 border-t border-brand-gray-mid space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span><span>{formatCurrency(itemsTotal)}</span>
            </div>
            {(q.discount ?? 0) > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Desconto</span><span>- {formatCurrency(q.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-brand-gray-mid">
              <span>Total estimado</span>
              <span className="text-brand-yellow">{formatCurrency(q.total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-600">
          Orçamento criado em {new Date(q.created_at).toLocaleString("pt-BR")}. Clique em{" "}
          <strong className="text-gray-400">Fechar Venda</strong> para abrir o PDV com estes itens já carregados.
        </p>
      </div>
    </AppLayout>
  );
}
