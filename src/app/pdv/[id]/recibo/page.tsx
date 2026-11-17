import { notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { getSaleReceipt } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PDVSale } from "@/types";
import ReciboActions from "./ReciboActions";
import PrintButton from "./PrintButton";

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

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Sep() {
  return <div style={{ borderTop: "1.5px dashed #000", margin: "8px 0" }} />;
}

export default async function ReciboPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sale = (await getSaleReceipt(id)) as PDVSale | null;
  if (!sale) notFound();

  const supabase = createAdminClient();
  const [storeRes, sellerRes] = await Promise.all([
    supabase.from("store_settings").select("store_name, address, city, state_abbr, phone_number, cnpj").single(),
    (sale as any).seller_id
      ? supabase.from("erp_employees").select("name").eq("id", (sale as any).seller_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const store = storeRes.data as any;
  const storeName = store?.store_name ?? "NORTE TECNOLOGIA";
  const storeAddress = [store?.address, store?.city, store?.state_abbr].filter(Boolean).join(" — ");
  const storePhone = store?.phone_number ?? "";
  const sellerName = (sellerRes.data as any)?.name ?? "";

  const items = sale.erp_pdv_sale_items ?? [];
  const payments = sale.erp_pdv_sale_payments ?? [];
  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const change = paidTotal - sale.total;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: #fff; }
          @page { size: 80mm auto; margin: 4mm; }
        }
        body { background: #f0f0f0; }
        .receipt-wrap {
          display: flex;
          justify-content: center;
          padding: 24px 0;
          min-height: 100vh;
        }
        .receipt {
          background: #fff;
          width: 320px;
          padding: 20px 18px 24px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          font-weight: 600;
          color: #000;
          box-shadow: 0 2px 16px rgba(0,0,0,0.15);
        }
        @media print {
          body { background: #fff; }
          .receipt-wrap { padding: 0; min-height: auto; }
          .receipt { box-shadow: none; padding: 0; }
        }
      `}</style>

      {/* Action buttons */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 flex flex-wrap gap-2 p-3 bg-gray-100 border-b border-gray-300 shadow-sm">
        <a href="/pdv/vendas" className="bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-300">
          ← Voltar
        </a>
        <PrintButton />
        <a href="/pdv" className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-200">
          Nova venda
        </a>
        <a href={`/pdv/${id}/editar`} className="bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-200">
          ✏️ Editar
        </a>
        <ReciboActions saleId={id} />
      </div>

      <div className="receipt-wrap" style={{ paddingTop: "64px" }}>
        <div className="receipt">

          {/* Logo + store header */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="NT"
              style={{
                height: "52px",
                width: "auto",
                display: "block",
                margin: "0 auto 6px",
                filter: "grayscale(100%) contrast(10) brightness(0.15)",
              }}
            />
            <div style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "2px" }}>
              {storeName.toUpperCase()}
            </div>
            {storeAddress && (
              <div style={{ fontSize: "10px", color: "#000", fontWeight: "600", marginTop: "2px" }}>{storeAddress}</div>
            )}
            {storePhone && (
              <div style={{ fontSize: "10px", color: "#000", fontWeight: "600" }}>Tel: {storePhone}</div>
            )}
          </div>

          <div style={{ textAlign: "center", letterSpacing: "3px", fontSize: "10px", color: "#000", marginBottom: "6px" }}>
            * * * * * * * * * * * * * *
          </div>

          <div style={{ textAlign: "center", fontWeight: "900", fontSize: "13px", letterSpacing: "1px", marginBottom: "4px" }}>
            RECIBO DE VENDA
          </div>

          <Sep />

          {/* Sale number + date */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "900" }}>Nº {String(sale.sale_number).padStart(6, "0")}</span>
            <span style={{ color: "#000" }}>{fmtDateTime(sale.created_at)}</span>
          </div>

          {/* Customer */}
          {(sale.erp_customers as any)?.name && (
            <div style={{ marginTop: "4px" }}>
              <span style={{ fontWeight: "700" }}>Cliente: </span>
              <span style={{ fontWeight: "900" }}>{(sale.erp_customers as any).name}</span>
            </div>
          )}

          {/* Seller */}
          {sellerName && (
            <div style={{ marginTop: "2px" }}>
              <span style={{ fontWeight: "700" }}>Vendedor: </span>
              <span style={{ fontWeight: "900" }}>{sellerName}</span>
            </div>
          )}

          <Sep />

          {/* Items header */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#000", fontWeight: "900", marginBottom: "4px", textTransform: "uppercase" }}>
            <span>Descrição</span>
            <span>Valor</span>
          </div>

          {/* Items */}
          {items.map((item) => (
            <div key={item.id} style={{ marginBottom: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ flex: 1, marginRight: "8px", wordBreak: "break-word", fontWeight: "700" }}>{item.description}</span>
                <span style={{ flexShrink: 0, fontWeight: "900" }}>{formatCurrency(item.subtotal)}</span>
              </div>
              {item.quantity > 1 && (
                <div style={{ color: "#000", fontSize: "11px", paddingLeft: "8px" }}>
                  {item.quantity} × {formatCurrency(item.unit_price)}
                </div>
              )}
            </div>
          ))}

          <Sep />

          {/* Subtotal + discount */}
          {(sale.discount ?? 0) > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <span>{formatCurrency(sale.total + (sale.discount ?? 0))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Desconto</span>
                <span>- {formatCurrency(sale.discount!)}</span>
              </div>
            </>
          )}

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "16px", marginTop: "4px", paddingTop: "5px", borderTop: "3px solid #000" }}>
            <span>TOTAL</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>

          <Sep />

          {/* Payments */}
          <div style={{ marginBottom: "4px", fontSize: "10px", color: "#000", fontWeight: "900", textTransform: "uppercase" }}>Pagamento</div>
          {payments.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
              <span>{PAYMENT_LABELS[p.method] ?? p.method}</span>
              <span>{formatCurrency(p.amount)}</span>
            </div>
          ))}

          {change > 0.001 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontWeight: "900" }}>
              <span>Troco</span>
              <span>{formatCurrency(change)}</span>
            </div>
          )}

          <Sep />

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <div style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "1px" }}>
              OBRIGADO!
            </div>
            <div style={{ color: "#000", fontSize: "10px", fontWeight: "600", marginTop: "2px" }}>
              Volte sempre · {storeName}
            </div>
          </div>

          <div style={{ textAlign: "center", letterSpacing: "3px", fontSize: "10px", color: "#000", marginTop: "10px" }}>
            * * * * * * * * * * * * * *
          </div>
        </div>
      </div>
    </>
  );
}
