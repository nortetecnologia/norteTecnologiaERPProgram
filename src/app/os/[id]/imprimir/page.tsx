import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate, formatOSNumber, formatPhone } from "@/lib/utils";
import { OS_STATUS_LABELS, type ServiceOrder } from "@/types";
import PrintButtons from "./PrintButtons";

export default async function OSPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sem_valores?: string }>;
}) {
  const { id } = await params;
  const { sem_valores } = await searchParams;
  const hideValues = sem_valores === "1";

  const supabase = createAdminClient();
  const { data: os } = await supabase
    .from("erp_service_orders")
    .select("*, erp_customers(*), erp_service_order_items(*, products(name, sku))")
    .eq("id", id)
    .single<ServiceOrder>();

  if (!os) notFound();

  const items = os.erp_service_order_items ?? [];
  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = (os.labor_cost ?? 0) + itemsTotal - (os.discount ?? 0);

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-2xl mx-auto font-sans">
      <PrintButtons osId={id} hideValues={hideValues} />

      {/* Header */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
        <div>
          <div className="text-xl font-black text-gray-900">Norte Tecnologia</div>
          <div className="text-sm text-gray-500">Ordem de Serviço</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-gray-900">{formatOSNumber(os.number)}</div>
          <div className="text-xs text-gray-400">{formatDate(os.created_at)}</div>
          <div className="text-xs font-semibold mt-1">{OS_STATUS_LABELS[os.status]}</div>
        </div>
      </div>

      {/* Client */}
      <div className="mb-5 p-4 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Cliente</div>
        <div className="font-semibold">{(os.erp_customers as any)?.name}</div>
        {(os.erp_customers as any)?.phone && (
          <div className="text-sm text-gray-600">{formatPhone((os.erp_customers as any).phone)}</div>
        )}
        {(os.erp_customers as any)?.address && (
          <div className="text-sm text-gray-600">{(os.erp_customers as any).address}</div>
        )}
      </div>

      {/* Problem */}
      <div className="mb-5">
        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Problema relatado</div>
        <div className="font-semibold">{os.title}</div>
        {os.description && <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{os.description}</div>}
      </div>

      {/* Equipment */}
      {(os.equipment || os.serial_number || os.estimated_at) && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          {os.equipment && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Equipamento</div>
              <div className="text-sm font-medium">{os.equipment}</div>
            </div>
          )}
          {os.serial_number && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Nº de série</div>
              <div className="text-sm font-medium">{os.serial_number}</div>
            </div>
          )}
          {os.estimated_at && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Previsão de entrega</div>
              <div className="text-sm font-medium">{formatDate(os.estimated_at)}</div>
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {items.length > 0 && (
        <div className="mb-5">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Peças e Serviços</div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 text-xs font-semibold">Descrição</th>
                <th className="text-right p-2 text-xs font-semibold">Qtd</th>
                {!hideValues && (
                  <>
                    <th className="text-right p-2 text-xs font-semibold">Unit.</th>
                    <th className="text-right p-2 text-xs font-semibold">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="p-2">{item.description}</td>
                  <td className="p-2 text-right">{item.quantity}</td>
                  {!hideValues && (
                    <>
                      <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.quantity * item.unit_price)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!hideValues && (
            <div className="mt-3 text-right space-y-1 text-sm">
              {(os.labor_cost ?? 0) > 0 && (
                <div>Mão de obra: <strong>{formatCurrency(os.labor_cost!)}</strong></div>
              )}
              {(os.discount ?? 0) > 0 && (
                <div>Desconto: <strong>- {formatCurrency(os.discount!)}</strong></div>
              )}
              <div className="text-base font-bold">Total: {formatCurrency(total)}</div>
            </div>
          )}
        </div>
      )}

      {/* Signature */}
      <div className="mt-10 pt-4 border-t border-gray-200 grid grid-cols-2 gap-8 text-sm text-gray-500">
        <div>
          <div className="border-b border-gray-400 mb-1 h-8"></div>
          Assinatura do cliente
        </div>
        <div>
          <div className="border-b border-gray-400 mb-1 h-8"></div>
          Responsável técnico
        </div>
      </div>
    </div>
  );
}
