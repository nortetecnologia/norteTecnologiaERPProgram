import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { PDVSale } from "@/types";

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: sale } = await supabase
    .from("erp_pdv_sales")
    .select("*, erp_customers(name, phone), erp_pdv_sale_items(*), erp_pdv_sale_payments(*)")
    .eq("id", id)
    .single<PDVSale>();

  if (!sale) notFound();

  const items = sale.erp_pdv_sale_items ?? [];
  const payments = sale.erp_pdv_sale_payments ?? [];

  const PAYMENT_LABELS: Record<string, string> = {
    dinheiro: "Dinheiro",
    pix: "Pix",
    debito: "Débito",
    credito_1x: "Crédito 1x",
    credito_2x: "Crédito 2x",
    credito_3x: "Crédito 3x",
    credito_6x: "Crédito 6x",
    credito_12x: "Crédito 12x",
  };

  return (
    <div className="min-h-screen bg-white text-black p-6 max-w-sm mx-auto font-mono text-sm">
      <div className="no-print flex gap-2 mb-4">
        <button
          onClick={() => window.print()}
          className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg"
        >
          🖨 Imprimir
        </button>
        <a
          href="/pdv"
          className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg"
        >
          Nova venda
        </a>
        <a
          href="/dashboard"
          className="text-gray-400 text-xs px-3 py-1.5"
        >
          Dashboard
        </a>
      </div>

      {/* Receipt */}
      <div className="text-center mb-4">
        <div className="text-lg font-bold">NORTE TECNOLOGIA</div>
        <div className="text-xs text-gray-500">Recibo de Venda</div>
        <div className="text-xs text-gray-500">#{sale.sale_number}</div>
        <div className="text-xs text-gray-400">{formatDateTime(sale.created_at)}</div>
      </div>

      {(sale.erp_customers as any)?.name && (
        <div className="text-xs mb-3 border-t border-dashed border-gray-300 pt-2">
          Cliente: {(sale.erp_customers as any).name}
        </div>
      )}

      <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-xs mb-1">
            <div className="flex-1 mr-2">
              <span>{item.description}</span>
              {item.quantity > 1 && (
                <span className="text-gray-500 block">
                  {item.quantity} x {formatCurrency(item.unit_price)}
                </span>
              )}
            </div>
            <span className="shrink-0">{formatCurrency(item.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-xs">
        {(sale.discount ?? 0) > 0 && (
          <div className="flex justify-between">
            <span>Desconto</span>
            <span>- {formatCurrency(sale.discount!)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-300 pt-2 mt-2 space-y-1 text-xs">
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between">
            <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 mt-4 border-t border-dashed border-gray-300 pt-3">
        Obrigado pela preferência!
      </div>

      <style>{`@media print { .no-print { display: none; } }`}</style>
    </div>
  );
}
