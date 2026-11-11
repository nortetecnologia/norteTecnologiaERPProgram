import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate, formatOSNumber, formatPhone } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS, type ServiceOrder } from "@/types";
import OSStatusForm from "./OSStatusForm";
import OSImageUpload from "./OSImageUpload";

export default async function OSDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: os } = await supabase
    .from("erp_service_orders")
    .select("*, erp_customers(*), erp_service_order_items(*, products(name, sku))")
    .eq("id", id)
    .single<ServiceOrder>();

  if (!os) notFound();

  const items = os.erp_service_order_items ?? [];
  const itemsTotal = items.reduce(
    (sum, i) => sum + i.quantity * i.unit_price,
    0
  );
  const total = (os.labor_cost ?? 0) + itemsTotal - (os.discount ?? 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{formatOSNumber(os.number)}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full ${OS_STATUS_COLORS[os.status]}`}>
                {OS_STATUS_LABELS[os.status]}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{os.title}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/os/${id}/imprimir`}
              className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-300 rounded-lg hover:border-gray-400 transition-colors"
            >
              🖨 Imprimir
            </Link>
          </div>
        </div>

        {/* Client + status change */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-2">Cliente</div>
            <div className="text-sm text-white font-medium">{(os.erp_customers as any)?.name}</div>
            {(os.erp_customers as any)?.phone && (
              <div className="text-xs text-gray-400 mt-1">{formatPhone((os.erp_customers as any).phone)}</div>
            )}
          </div>
          <OSStatusForm osId={os.id} currentStatus={os.status} />
        </div>

        {/* Details */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 mb-4 space-y-3">
          {os.equipment && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Equipamento</span>
              <span className="text-white">{os.equipment}</span>
            </div>
          )}
          {os.serial_number && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Número de série</span>
              <span className="text-white">{os.serial_number}</span>
            </div>
          )}
          {os.estimated_at && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Previsão de entrega</span>
              <span className="text-white">{formatDate(os.estimated_at)}</span>
            </div>
          )}
          {os.description && (
            <div className="text-sm">
              <div className="text-gray-400 mb-1">Descrição do problema</div>
              <div className="text-white whitespace-pre-wrap">{os.description}</div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-4">
          <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
            Peças e Serviços
          </div>
          {items.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-500">Nenhum item adicionado.</p>
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
              <span>Itens</span>
              <span>{formatCurrency(itemsTotal)}</span>
            </div>
            {(os.labor_cost ?? 0) > 0 && (
              <div className="flex justify-between text-gray-400">
                <span>Mão de obra</span>
                <span>{formatCurrency(os.labor_cost!)}</span>
              </div>
            )}
            {(os.discount ?? 0) > 0 && (
              <div className="flex justify-between text-red-400">
                <span>Desconto</span>
                <span>- {formatCurrency(os.discount!)}</span>
              </div>
            )}
            <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-brand-gray-mid">
              <span>Total</span>
              <span className="text-brand-yellow">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {os.notes && (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 mb-4">
            <div className="text-xs text-gray-500 mb-2">Observações internas</div>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">{os.notes}</div>
          </div>
        )}

        {/* Images — editable */}
        <OSImageUpload osId={os.id} initialImages={os.images ?? []} />
      </div>
    </AppLayout>
  );
}
