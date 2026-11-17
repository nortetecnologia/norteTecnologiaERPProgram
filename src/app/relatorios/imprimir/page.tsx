import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { OS_STATUS_LABELS } from "@/types";
import type { OSStatus } from "@/types";
import PrintButton from "./PrintButton";

interface StoreSettings {
  store_name: string;
  phone_number?: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state_abbr?: string;
  cnpj?: string;
}

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

function buildDateRange(ano: string, mes: string, dia: string) {
  const year = parseInt(ano) || new Date().getFullYear();
  if (mes && dia) {
    const m = parseInt(mes) - 1;
    const d = parseInt(dia);
    return {
      start: new Date(year, m, d, 0, 0, 0).toISOString(),
      end: new Date(year, m, d, 23, 59, 59).toISOString(),
      label: `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${year}`,
    };
  }
  if (mes) {
    const m = parseInt(mes) - 1;
    return {
      start: new Date(year, m, 1).toISOString(),
      end: new Date(year, m + 1, 0, 23, 59, 59).toISOString(),
      label: `${String(m + 1).padStart(2, "0")}/${year}`,
    };
  }
  return {
    start: new Date(year, 0, 1).toISOString(),
    end: new Date(year, 11, 31, 23, 59, 59).toISOString(),
    label: String(year),
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function hr() {
  return <div style={{ borderTop: "1px solid #333", margin: "6px 0" }} />;
}

export default async function RelatoriosImprimirPage({
  searchParams,
}: {
  searchParams: Promise<{
    aba?: string;
    ano?: string;
    mes?: string;
    dia?: string;
    cliente_id?: string;
    detalhes?: string;
  }>;
}) {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const aba = params.aba === "os" ? "os" : "vendas";
  const detalhes = params.detalhes === "1";
  const now = new Date();
  const ano = params.ano ?? String(now.getFullYear());
  const mes = params.mes ?? (aba === "vendas" ? String(now.getMonth() + 1) : "");
  const dia = params.dia ?? "";
  const clienteId = params.cliente_id ?? "";

  const { start, end, label: periodoLabel } = buildDateRange(ano, mes, dia);

  const supabase = createAdminClient();

  const [{ data: store }, { data: clientes }] = await Promise.all([
    supabase.from("store_settings").select("*").single<StoreSettings>(),
    supabase.from("erp_customers").select("id, name").order("name"),
  ]);

  const storeName = store?.store_name ?? "Norte Tecnologia";
  const cnpj = (store as any)?.cnpj ?? "";
  const storeAddressParts = [store?.address, store?.city, store?.state_abbr].filter(Boolean);
  const storeAddress = storeAddressParts.join(" — ");

  const clienteName = clienteId && clientes
    ? (clientes.find((c) => c.id === clienteId)?.name ?? "")
    : "";

  const backParams = new URLSearchParams({ aba, ano });
  if (mes) backParams.set("mes", mes);
  if (dia) backParams.set("dia", dia);
  if (clienteId) backParams.set("cliente_id", clienteId);
  if (detalhes) backParams.set("detalhes", "1");
  const backHref = `/relatorios?${backParams.toString()}`;

  // ── Styles ────────────────────────────────────────────────────────────────
  const page: CSSProperties = {
    fontFamily: "Arial, sans-serif",
    fontSize: "10pt",
    color: "#000",
    background: "#fff",
    maxWidth: "210mm",
    margin: "0 auto",
    padding: "10mm",
    lineHeight: "1.5",
  };
  const bold: CSSProperties = { fontWeight: "bold" };
  const small: CSSProperties = { fontSize: "9pt", color: "#444" };
  const th: CSSProperties = {
    textAlign: "left",
    padding: "4px 8px",
    borderBottom: "1px solid #ccc",
    fontSize: "8pt",
    textTransform: "uppercase",
    color: "#666",
  };
  const td: CSSProperties = {
    padding: "4px 8px",
    borderBottom: "1px solid #eee",
    fontSize: "9pt",
  };
  const tdRight: CSSProperties = { ...td, textAlign: "right" };
  const tdItem: CSSProperties = {
    padding: "2px 8px 2px 24px",
    borderBottom: "1px solid #f5f5f5",
    fontSize: "8pt",
    color: "#555",
  };

  // ── Vendas PDV ─────────────────────────────────────────────────────────────
  if (aba === "vendas") {
    // Fetch sales with customer info
    let salesQuery = supabase
      .from("erp_pdv_sales")
      .select("id, sale_number, total, discount, created_at, customer_id, erp_customers(name)")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });
    if (clienteId) salesQuery = salesQuery.eq("customer_id", clienteId);
    const salesRes = await salesQuery;
    const sales = salesRes.data ?? [];
    const saleIds = sales.map((s: any) => s.id);

    const [paymentsRes, saleItemsRes] = (await Promise.all([
      saleIds.length > 0
        ? supabase.from("erp_pdv_sale_payments").select("method, amount").in("sale_id", saleIds)
        : Promise.resolve({ data: null }),
      saleIds.length > 0
        ? supabase.from("erp_pdv_sale_items").select("sale_id, description, quantity, unit_price, subtotal").in("sale_id", saleIds)
        : Promise.resolve({ data: null }),
    ])) as any[];

    const payments = paymentsRes.data ?? [];
    const saleItems = saleItemsRes.data ?? [];

    const pdvTotal = sales.reduce((s: number, v: any) => s + (v.total ?? 0), 0);
    const pdvCount = sales.length;
    const pdvTicket = pdvCount > 0 ? pdvTotal / pdvCount : 0;

    const paymentByMethod: Record<string, number> = {};
    for (const p of payments) {
      const m = (p as any).method as string;
      paymentByMethod[m] = (paymentByMethod[m] ?? 0) + ((p as any).amount ?? 0);
    }
    const paymentEntries = Object.entries(paymentByMethod).sort((a, b) => b[1] - a[1]);

    const productTotals: Record<string, { qty: number; total: number }> = {};
    for (const item of saleItems) {
      const desc = (item as any).description as string;
      if (!productTotals[desc]) productTotals[desc] = { qty: 0, total: 0 };
      productTotals[desc].qty += (item as any).quantity ?? 1;
      productTotals[desc].total += (item as any).subtotal ?? 0;
    }
    const topProducts = Object.entries(productTotals).sort((a, b) => b[1].total - a[1].total);

    // Top cliente
    const clienteByTotal: Record<string, { name: string; total: number }> = {};
    for (const s of sales) {
      const cid = (s as any).customer_id;
      if (!cid) continue;
      const cname = (s as any).erp_customers?.name ?? "?";
      clienteByTotal[cid] = {
        name: cname,
        total: (clienteByTotal[cid]?.total ?? 0) + ((s as any).total ?? 0),
      };
    }
    const topCliente = Object.entries(clienteByTotal)
      .sort((a, b) => b[1].total - a[1].total)[0] ?? null;

    // Items per sale map
    const saleItemsMap: Record<string, any[]> = {};
    for (const item of saleItems) {
      const sid = (item as any).sale_id as string;
      if (sid) {
        if (!saleItemsMap[sid]) saleItemsMap[sid] = [];
        saleItemsMap[sid].push(item);
      }
    }

    return (
      <>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; background: #fff; }
            @page { size: A4 portrait; margin: 0.8cm; }
          }
          .no-print {
            display: flex; gap: 8px; padding: 12px 16px;
            background: #f3f4f6; border-bottom: 1px solid #d1d5db;
            position: sticky; top: 0; z-index: 10;
          }
          .btn-print {
            background: #111; color: #fff; border: none;
            padding: 8px 16px; border-radius: 6px;
            font-size: 13px; cursor: pointer;
          }
          .btn-secondary {
            background: #e5e7eb; color: #374151; border: none;
            padding: 8px 16px; border-radius: 6px;
            font-size: 13px; cursor: pointer; text-decoration: none;
          }
        `}</style>

        <PrintButton backHref={backHref} />

        <div style={page}>
          {/* Cabeçalho */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Logo" style={{ height: "50px", width: "auto" }} />
              <div>
                <div style={{ fontSize: "14pt", fontWeight: "900", letterSpacing: "1px" }}>{storeName.toUpperCase()}</div>
                {storeAddress && <div style={small}>{storeAddress}</div>}
              </div>
            </div>
            {cnpj && (
              <div style={{ textAlign: "right", ...small }}>CNPJ {cnpj}</div>
            )}
          </div>

          {hr()}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
            <div style={{ fontSize: "12pt", ...bold }}>RELATÓRIO DE VENDAS PDV</div>
            <div style={small}>Emitido em: {fmtDate(new Date().toISOString())}</div>
          </div>

          <div style={{ ...small, marginBottom: "4px" }}>
            <span>Período: <strong>{periodoLabel}</strong></span>
            {clienteName && <span style={{ marginLeft: "16px" }}>Cliente: <strong>{clienteName}</strong></span>}
          </div>

          {hr()}

          {/* Resumo */}
          <div style={{ display: "flex", gap: "24px", margin: "8px 0", flexWrap: "wrap" }}>
            {[
              { label: "Total de vendas", value: String(pdvCount) },
              { label: "Receita total", value: formatCurrency(pdvTotal) },
              { label: "Ticket médio", value: formatCurrency(pdvTicket) },
            ].map((s) => (
              <div key={s.label} style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "8px 16px", minWidth: "120px" }}>
                <div style={{ ...small, fontSize: "7pt", textTransform: "uppercase" }}>{s.label}</div>
                <div style={{ fontWeight: "bold", fontSize: "12pt" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Rankings */}
          {(topCliente || topProducts[0]) && (
            <div style={{ display: "flex", gap: "16px", margin: "8px 0", flexWrap: "wrap" }}>
              {topCliente && (
                <div style={{ border: "1px solid #e8c84a", borderRadius: "4px", padding: "8px 16px", minWidth: "160px", background: "#fffbeb" }}>
                  <div style={{ fontSize: "7pt", textTransform: "uppercase", color: "#666" }}>🏆 Cliente que mais comprou</div>
                  <div style={{ fontWeight: "bold", fontSize: "10pt" }}>{topCliente[1].name}</div>
                  <div style={{ fontSize: "9pt", color: "#555" }}>{formatCurrency(topCliente[1].total)}</div>
                </div>
              )}
              {topProducts[0] && (
                <div style={{ border: "1px solid #e8c84a", borderRadius: "4px", padding: "8px 16px", minWidth: "160px", background: "#fffbeb" }}>
                  <div style={{ fontSize: "7pt", textTransform: "uppercase", color: "#666" }}>🏷 Produto mais vendido</div>
                  <div style={{ fontWeight: "bold", fontSize: "10pt" }}>{topProducts[0][0]}</div>
                  <div style={{ fontSize: "9pt", color: "#555" }}>{topProducts[0][1].qty} un · {formatCurrency(topProducts[0][1].total)}</div>
                </div>
              )}
            </div>
          )}

          {hr()}

          {/* Formas de pagamento */}
          {paymentEntries.length > 0 && (
            <>
              <div style={{ ...bold, fontSize: "9pt", margin: "8px 0 4px" }}>FORMAS DE PAGAMENTO</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Forma</th>
                    <th style={{ ...th, textAlign: "right" }}>Valor</th>
                    <th style={{ ...th, textAlign: "right" }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentEntries.map(([method, amount]) => (
                    <tr key={method}>
                      <td style={td}>{PAYMENT_LABELS[method] ?? method}</td>
                      <td style={tdRight}>{formatCurrency(amount)}</td>
                      <td style={tdRight}>
                        {pdvTotal > 0 ? ((amount / pdvTotal) * 100).toFixed(1) : "0.0"}%
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...td, ...bold }}>Total</td>
                    <td style={{ ...tdRight, ...bold }}>{formatCurrency(pdvTotal)}</td>
                    <td style={tdRight}>100%</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {hr()}

          {/* Produtos mais vendidos */}
          {topProducts.length > 0 && (
            <>
              <div style={{ ...bold, fontSize: "9pt", margin: "8px 0 4px" }}>PRODUTOS VENDIDOS</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "30px" }}>#</th>
                    <th style={th}>Produto</th>
                    <th style={{ ...th, textAlign: "right" }}>Qtd</th>
                    <th style={{ ...th, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map(([desc, { qty, total }], i) => (
                    <tr key={desc}>
                      <td style={{ ...td, color: "#666" }}>{i + 1}</td>
                      <td style={td}>{desc}</td>
                      <td style={tdRight}>{qty}</td>
                      <td style={tdRight}>{formatCurrency(total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Lista de vendas */}
          {pdvCount > 0 && (
            <>
              {hr()}
              <div style={{ ...bold, fontSize: "9pt", margin: "8px 0 4px" }}>
                VENDAS NO PERÍODO ({pdvCount})
                {detalhes && <span style={{ fontWeight: "normal", fontSize: "8pt", color: "#666", marginLeft: "8px" }}>— itens detalhados</span>}
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, width: "70px" }}>Nº</th>
                    <th style={th}>Data</th>
                    <th style={th}>Cliente</th>
                    <th style={{ ...th, textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.flatMap((s: any) => [
                    <tr key={s.id}>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold" }}>
                        #{String(s.sale_number).padStart(6, "0")}
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(s.created_at)}</td>
                      <td style={td}>{(s.erp_customers as any)?.name ?? "—"}</td>
                      <td style={{ ...tdRight, fontWeight: "bold" }}>{formatCurrency(s.total)}</td>
                    </tr>,
                    ...(detalhes
                      ? (saleItemsMap[s.id] ?? []).map((item: any, idx: number) => (
                          <tr key={`${s.id}-i-${idx}`} style={{ background: "#fafafa" }}>
                            <td style={tdItem}>↳</td>
                            <td colSpan={2} style={tdItem}>
                              {item.description} — {item.quantity}× {formatCurrency(item.unit_price ?? 0)}
                            </td>
                            <td style={{ ...tdItem, textAlign: "right" }}>
                              {formatCurrency(item.subtotal ?? (item.quantity ?? 1) * (item.unit_price ?? 0))}
                            </td>
                          </tr>
                        ))
                      : []),
                  ])}
                  <tr>
                    <td colSpan={3} style={{ ...td, textAlign: "right", ...bold, borderTop: "2px solid #333" }}>
                      Total
                    </td>
                    <td style={{ ...tdRight, ...bold, borderTop: "2px solid #333" }}>
                      {formatCurrency(pdvTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {pdvCount === 0 && (
            <p style={{ color: "#666", textAlign: "center", padding: "20px 0" }}>
              Nenhuma venda encontrada para este período.
            </p>
          )}
        </div>
      </>
    );
  }

  // ── Ordens de Serviço ──────────────────────────────────────────────────────
  let osQuery = supabase
    .from("erp_service_orders")
    .select(`
      id, number, title, status, equipment, labor_cost, discount, created_at,
      erp_customers(id, name),
      erp_service_order_items(description, quantity, unit_price)
    `)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });

  if (clienteId) osQuery = osQuery.eq("customer_id", clienteId);

  const { data: osRawList } = await osQuery;
  const osList = osRawList ?? [];

  const osWithTotals = osList.map((o: any) => {
    const itemsTotal = (o.erp_service_order_items ?? []).reduce(
      (s: number, i: any) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0
    );
    const total = itemsTotal + (o.labor_cost ?? 0) - (o.discount ?? 0);
    return { ...o, computed_total: total };
  });

  const totalFaturado = osWithTotals.reduce((s, o) => s + o.computed_total, 0);
  const osCount = osWithTotals.length;
  const ticketMedio = osCount > 0 ? totalFaturado / osCount : 0;

  const statusCount: Record<string, number> = {};
  for (const o of osWithTotals) {
    statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
  }

  // Top cliente (OS)
  const osClienteByTotal: Record<string, { name: string; total: number }> = {};
  for (const o of osWithTotals) {
    const cid = (o.erp_customers as any)?.id;
    const cname = (o.erp_customers as any)?.name;
    if (!cid || !cname) continue;
    osClienteByTotal[cid] = {
      name: cname,
      total: (osClienteByTotal[cid]?.total ?? 0) + o.computed_total,
    };
  }
  const topClienteOS = Object.entries(osClienteByTotal)
    .sort((a, b) => b[1].total - a[1].total)[0] ?? null;

  // Top serviço/produto
  const osServByQty: Record<string, { qty: number; total: number }> = {};
  for (const o of osWithTotals) {
    for (const item of (o.erp_service_order_items ?? []) as any[]) {
      const desc = (item.description as string) || "?";
      osServByQty[desc] = {
        qty: (osServByQty[desc]?.qty ?? 0) + (item.quantity ?? 1),
        total: (osServByQty[desc]?.total ?? 0) + (item.quantity ?? 1) * (item.unit_price ?? 0),
      };
    }
  }
  const topServico = Object.entries(osServByQty)
    .sort((a, b) => b[1].qty - a[1].qty)[0] ?? null;
  const topServicos = Object.entries(osServByQty)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 10);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: #fff; }
          @page { size: A4 portrait; margin: 0.8cm; }
        }
        .no-print {
          display: flex; gap: 8px; padding: 12px 16px;
          background: #f3f4f6; border-bottom: 1px solid #d1d5db;
          position: sticky; top: 0; z-index: 10;
        }
        .btn-print {
          background: #111; color: #fff; border: none;
          padding: 8px 16px; border-radius: 6px;
          font-size: 13px; cursor: pointer;
        }
        .btn-secondary {
          background: #e5e7eb; color: #374151; border: none;
          padding: 8px 16px; border-radius: 6px;
          font-size: 13px; cursor: pointer; text-decoration: none;
        }
      `}</style>

      <PrintButton backHref={backHref} />

      <div style={page}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: "50px", width: "auto" }} />
            <div>
              <div style={{ fontSize: "14pt", fontWeight: "900", letterSpacing: "1px" }}>{storeName.toUpperCase()}</div>
              {storeAddress && <div style={small}>{storeAddress}</div>}
            </div>
          </div>
          {cnpj && (
            <div style={{ textAlign: "right", ...small }}>CNPJ {cnpj}</div>
          )}
        </div>

        {hr()}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0" }}>
          <div style={{ fontSize: "12pt", ...bold }}>RELATÓRIO DE ORDENS DE SERVIÇO</div>
          <div style={small}>Emitido em: {fmtDate(new Date().toISOString())}</div>
        </div>

        <div style={{ ...small, marginBottom: "4px" }}>
          <span>Período: <strong>{periodoLabel}</strong></span>
          {clienteName && <span style={{ marginLeft: "16px" }}>Cliente: <strong>{clienteName}</strong></span>}
        </div>

        {hr()}

        {/* Resumo */}
        <div style={{ display: "flex", gap: "24px", margin: "8px 0", flexWrap: "wrap" }}>
          {[
            { label: "Total de OS", value: String(osCount) },
            { label: "Total faturado", value: formatCurrency(totalFaturado) },
            { label: "Ticket médio", value: formatCurrency(ticketMedio) },
          ].map((s) => (
            <div key={s.label} style={{ border: "1px solid #ccc", borderRadius: "4px", padding: "8px 16px", minWidth: "120px" }}>
              <div style={{ ...small, fontSize: "7pt", textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontWeight: "bold", fontSize: "12pt" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Rankings */}
        {(topClienteOS || topServico) && (
          <div style={{ display: "flex", gap: "16px", margin: "8px 0", flexWrap: "wrap" }}>
            {topClienteOS && (
              <div style={{ border: "1px solid #e8c84a", borderRadius: "4px", padding: "8px 16px", minWidth: "160px", background: "#fffbeb" }}>
                <div style={{ fontSize: "7pt", textTransform: "uppercase", color: "#666" }}>🏆 Cliente com mais OS</div>
                <div style={{ fontWeight: "bold", fontSize: "10pt" }}>{topClienteOS[1].name}</div>
                <div style={{ fontSize: "9pt", color: "#555" }}>{formatCurrency(topClienteOS[1].total)}</div>
              </div>
            )}
            {topServico && (
              <div style={{ border: "1px solid #e8c84a", borderRadius: "4px", padding: "8px 16px", minWidth: "160px", background: "#fffbeb" }}>
                <div style={{ fontSize: "7pt", textTransform: "uppercase", color: "#666" }}>🔧 Serviço mais pedido</div>
                <div style={{ fontWeight: "bold", fontSize: "10pt" }}>{topServico[0]}</div>
                <div style={{ fontSize: "9pt", color: "#555" }}>{topServico[1].qty} un</div>
              </div>
            )}
          </div>
        )}

        {/* Status breakdown */}
        {Object.keys(statusCount).length > 0 && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", margin: "4px 0 8px" }}>
            {Object.entries(statusCount).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
              <span key={status} style={{ fontSize: "8pt", padding: "2px 8px", border: "1px solid #ccc", borderRadius: "12px" }}>
                {OS_STATUS_LABELS[status as OSStatus] ?? status}: <strong>{count}</strong>
              </span>
            ))}
          </div>
        )}

        {/* Top serviços */}
        {topServicos.length > 0 && (
          <>
            {hr()}
            <div style={{ ...bold, fontSize: "9pt", margin: "8px 0 4px" }}>SERVIÇOS/PRODUTOS MAIS SOLICITADOS</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: "30px" }}>#</th>
                  <th style={th}>Descrição</th>
                  <th style={{ ...th, textAlign: "right" }}>Qtd</th>
                  <th style={{ ...th, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {topServicos.map(([desc, { qty, total }], i) => (
                  <tr key={desc}>
                    <td style={{ ...td, color: "#666" }}>{i + 1}</td>
                    <td style={td}>{desc}</td>
                    <td style={tdRight}>{qty}</td>
                    <td style={tdRight}>{formatCurrency(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {hr()}

        {/* OS Table */}
        {osCount === 0 ? (
          <p style={{ color: "#666", textAlign: "center", padding: "20px 0" }}>
            Nenhuma OS encontrada para este período.
          </p>
        ) : (
          <>
            <div style={{ ...bold, fontSize: "9pt", margin: "8px 0 4px" }}>
              ORDENS DE SERVIÇO ({osCount})
              {detalhes && <span style={{ fontWeight: "normal", fontSize: "8pt", color: "#666", marginLeft: "8px" }}>— itens detalhados</span>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Nº</th>
                  <th style={th}>Data</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Equipamento</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {osWithTotals.flatMap((o) => [
                  <tr key={o.id}>
                    <td style={{ ...td, fontFamily: "monospace", fontWeight: "bold" }}>
                      NT-{String(o.number).padStart(5, "0")}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtDate(o.created_at)}</td>
                    <td style={{ ...td, maxWidth: "150px" }}>
                      {(o.erp_customers as any)?.name ?? "—"}
                    </td>
                    <td style={{ ...td, maxWidth: "120px", color: "#555" }}>
                      {o.equipment ?? "—"}
                    </td>
                    <td style={td}>
                      {OS_STATUS_LABELS[o.status as OSStatus] ?? o.status}
                    </td>
                    <td style={{ ...tdRight, fontWeight: "bold" }}>
                      {formatCurrency(o.computed_total)}
                    </td>
                  </tr>,
                  ...(detalhes
                    ? (o.erp_service_order_items ?? []).map((item: any, idx: number) => (
                        <tr key={`${o.id}-i-${idx}`} style={{ background: "#fafafa" }}>
                          <td style={tdItem}>↳</td>
                          <td style={tdItem} />
                          <td colSpan={3} style={tdItem}>
                            {item.description} — {item.quantity}× {formatCurrency(item.unit_price ?? 0)}
                          </td>
                          <td style={{ ...tdItem, textAlign: "right" }}>
                            {formatCurrency((item.quantity ?? 1) * (item.unit_price ?? 0))}
                          </td>
                        </tr>
                      ))
                    : []),
                ])}
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: "right", ...bold, borderTop: "2px solid #333" }}>
                    Total
                  </td>
                  <td style={{ ...tdRight, ...bold, borderTop: "2px solid #333" }}>
                    {formatCurrency(totalFaturado)}
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        )}
      </div>
    </>
  );
}
