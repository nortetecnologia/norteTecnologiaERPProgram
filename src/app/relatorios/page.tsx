import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS } from "@/types";
import type { OSStatus } from "@/types";

// ─── helpers ────────────────────────────────────────────────────────────────

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

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function RelatoriosPage({
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

  const supabase = createAdminClient();
  const now = new Date();
  const currentYear = now.getFullYear();

  // ── Clientes para o filtro ─────────────────────────────────────────────────
  const { data: clientes } = await supabase
    .from("erp_customers")
    .select("id, name")
    .order("name");

  // ── Filter dropdown options ────────────────────────────────────────────────
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];

  const selectCls = "bg-brand-gray-dark border border-brand-gray-mid text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-yellow";

  // ─────────────────────────────────────────────────────────────────────────
  // ABA VENDAS (PDV)
  // ─────────────────────────────────────────────────────────────────────────
  if (aba === "vendas") {
    const ano = params.ano ?? String(currentYear);
    const mes = params.mes ?? String(now.getMonth() + 1);
    const dia = params.dia ?? "";
    const clienteId = params.cliente_id ?? "";

    const { start, end, label: periodoLabel } = buildDateRange(ano, mes, dia);

    const daysInMonth = mes ? new Date(parseInt(ano), parseInt(mes), 0).getDate() : 31;
    const hasFilter = !!(params.mes || params.dia || params.cliente_id);

    // 1. Fetch sales with customer info
    let salesQuery = supabase
      .from("erp_pdv_sales")
      .select("id, sale_number, total, discount, created_at, customer_id, erp_customers(name)")
      .gte("created_at", start)
      .lte("created_at", end);
    if (clienteId) salesQuery = salesQuery.eq("customer_id", clienteId);
    const salesRes = await salesQuery;
    const sales = salesRes.data ?? [];
    const saleIds = sales.map((s: any) => s.id);

    // 2. Fetch related data in parallel
    const [paymentsRes, saleItemsRes, osRes, osStatusRes] = (await Promise.all([
      saleIds.length > 0
        ? supabase.from("erp_pdv_sale_payments").select("method, amount").in("sale_id", saleIds)
        : Promise.resolve({ data: null }),
      saleIds.length > 0
        ? supabase.from("erp_pdv_sale_items").select("sale_id, description, quantity, unit_price, subtotal").in("sale_id", saleIds)
        : Promise.resolve({ data: null }),
      supabase
        .from("erp_service_orders")
        .select("id, labor_cost, discount, erp_service_order_items(quantity, unit_price)")
        .gte("created_at", start).lte("created_at", end).neq("status", "cancelled"),
      supabase
        .from("erp_service_orders")
        .select("status")
        .gte("created_at", start).lte("created_at", end),
    ])) as any[];

    const payments = paymentsRes.data ?? [];
    const saleItems = saleItemsRes.data ?? [];
    const osList = osRes.data ?? [];
    const osStatuses = osStatusRes.data ?? [];

    const pdvTotal = sales.reduce((s: number, v: any) => s + (v.total ?? 0), 0);
    const pdvCount = sales.length;
    const pdvTicket = pdvCount > 0 ? pdvTotal / pdvCount : 0;

    const osTotal = osList.reduce((s: number, o: any) => {
      const items = (o.erp_service_order_items ?? []).reduce(
        (si: number, i: any) => si + i.quantity * i.unit_price, 0
      );
      return s + items + (o.labor_cost ?? 0) - (o.discount ?? 0);
    }, 0);
    const osCount = osList.length;

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
    const topProducts = Object.entries(productTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const statusCount: Record<string, number> = {};
    for (const o of osStatuses) {
      statusCount[(o as any).status] = (statusCount[(o as any).status] ?? 0) + 1;
    }

    // Top cliente (vendas)
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
    const topClienteVendas = Object.entries(clienteByTotal)
      .sort((a, b) => b[1].total - a[1].total)[0] ?? null;

    // Items per sale map (for detailed view)
    const saleItemsMap: Record<string, any[]> = {};
    for (const item of saleItems) {
      const sid = (item as any).sale_id as string;
      if (sid) {
        if (!saleItemsMap[sid]) saleItemsMap[sid] = [];
        saleItemsMap[sid].push(item);
      }
    }

    const printParams = new URLSearchParams({ aba: "vendas", ano, mes });
    if (dia) printParams.set("dia", dia);
    if (clienteId) printParams.set("cliente_id", clienteId);
    if (detalhes) printParams.set("detalhes", "1");
    const printHref = `/relatorios/imprimir?${printParams.toString()}`;

    // Toggle href (preserves all current params, flips detalhes)
    const baseVendasParams = new URLSearchParams({ aba: "vendas", ano });
    if (mes) baseVendasParams.set("mes", mes);
    if (dia) baseVendasParams.set("dia", dia);
    if (clienteId) baseVendasParams.set("cliente_id", clienteId);
    const toggleVendasHref = detalhes
      ? `/relatorios?${baseVendasParams.toString()}`
      : `/relatorios?${new URLSearchParams({ ...Object.fromEntries(baseVendasParams), detalhes: "1" }).toString()}`;

    return (
      <AppLayout>
        <div className="p-6 max-w-5xl">
          <PageHeader aba={aba} printHref={printHref} />

          {/* Filtros */}
          <form method="GET" action="/relatorios" className="mb-6">
            <input type="hidden" name="aba" value="vendas" />
            {detalhes && <input type="hidden" name="detalhes" value="1" />}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ano</label>
                <select name="ano" defaultValue={ano} className={selectCls}>
                  {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Mês</label>
                <select name="mes" defaultValue={mes} className={selectCls}>
                  <option value="">Todos</option>
                  {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dia</label>
                <select name="dia" defaultValue={dia} className={selectCls}>
                  <option value="">Todos</option>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={String(d)}>{String(d).padStart(2, "0")}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cliente</label>
                <select name="cliente_id" defaultValue={clienteId} className={`${selectCls} max-w-[200px]`}>
                  <option value="">Todos os clientes</option>
                  {(clientes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="px-4 py-2 bg-brand-yellow text-brand-black text-sm font-semibold rounded-lg hover:bg-yellow-400 transition-colors">
                Filtrar
              </button>
              {hasFilter && (
                <Link href="/relatorios?aba=vendas" className="px-4 py-2 border border-brand-gray-mid text-gray-400 text-sm rounded-lg hover:border-gray-400 transition-colors">
                  Limpar
                </Link>
              )}
            </div>
          </form>

          {/* Período label */}
          <div className="text-sm text-gray-400 mb-5">
            {pdvCount === 0 ? (
              <span>Nenhuma venda em <span className="text-white font-medium">{periodoLabel}</span></span>
            ) : (
              <span>
                <span className="text-white font-medium">{pdvCount}</span> venda{pdvCount !== 1 ? "s" : ""} em{" "}
                <span className="text-white font-medium">{periodoLabel}</span>
                {clienteId && clientes && (
                  <span className="ml-1">
                    — {clientes.find((c) => c.id === clienteId)?.name ?? ""}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Receita PDV", value: formatCurrency(pdvTotal), color: "text-green-400" },
              { label: "Vendas PDV", value: String(pdvCount), color: "text-blue-400" },
              { label: "Ticket médio", value: formatCurrency(pdvTicket), color: "text-brand-yellow" },
              { label: "OS faturadas", value: formatCurrency(osTotal), color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5">
                <div className="text-xs text-gray-500 mb-2">{s.label}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Rankings */}
          {(topClienteVendas || topProducts[0]) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {topClienteVendas && (
                <div className="bg-brand-gray-dark border border-brand-yellow/30 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">🏆 Cliente que mais comprou</div>
                  <div className="text-white font-semibold text-lg truncate">{topClienteVendas[1].name}</div>
                  <div className="text-brand-yellow text-sm mt-0.5">{formatCurrency(topClienteVendas[1].total)}</div>
                </div>
              )}
              {topProducts[0] && (
                <div className="bg-brand-gray-dark border border-brand-yellow/30 rounded-xl p-4">
                  <div className="text-xs text-gray-500 mb-1">🏷 Produto mais vendido</div>
                  <div className="text-white font-semibold text-lg truncate">{topProducts[0][0]}</div>
                  <div className="text-gray-400 text-sm mt-0.5">
                    {topProducts[0][1].qty} un · {formatCurrency(topProducts[0][1].total)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Payment methods */}
            <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
              <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
                Formas de pagamento
              </div>
              {paymentEntries.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-600">Sem pagamentos neste período.</p>
              ) : (
                <div className="p-5 space-y-3">
                  {paymentEntries.map(([method, amount]) => {
                    const pct = pdvTotal > 0 ? (amount / pdvTotal) * 100 : 0;
                    return (
                      <div key={method}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{PAYMENT_LABELS[method] ?? method}</span>
                          <span className="text-white font-medium">{formatCurrency(amount)}</span>
                        </div>
                        <div className="h-1.5 bg-brand-gray-mid rounded-full overflow-hidden">
                          <div className="h-full bg-brand-yellow rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* OS by status */}
            <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
              <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
                OS ({osCount}) — {periodoLabel}
              </div>
              {Object.keys(statusCount).length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-600">Sem OS neste período.</p>
              ) : (
                <div className="p-5 space-y-2">
                  {Object.entries(statusCount).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">{OS_STATUS_LABELS[status as OSStatus] ?? status}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-6">
            <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
              Produtos mais vendidos (PDV)
            </div>
            {topProducts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-600">Sem vendas neste período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left px-5 py-2">#</th>
                    <th className="text-left px-5 py-2">Produto</th>
                    <th className="text-right px-5 py-2">Qtd</th>
                    <th className="text-right px-5 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map(([desc, { qty, total }], i) => (
                    <tr key={desc} className="border-t border-brand-gray-mid hover:bg-white/5">
                      <td className="px-5 py-2.5 text-gray-500 w-8">{i + 1}</td>
                      <td className="px-5 py-2.5 text-white">{desc}</td>
                      <td className="px-5 py-2.5 text-right text-gray-300">{qty}</td>
                      <td className="px-5 py-2.5 text-right text-brand-yellow font-medium">{formatCurrency(total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Vendas no período (lista detalhada) */}
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
            <div className="px-5 py-3 border-b border-brand-gray-mid flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-300">
                Vendas no período ({pdvCount})
              </span>
              {pdvCount > 0 && (
                <Link
                  href={toggleVendasHref}
                  className={`text-xs px-3 py-1 rounded border transition-colors ${
                    detalhes
                      ? "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/50"
                      : "border-brand-gray-mid text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {detalhes ? "▾ Ocultar itens" : "▸ Ver itens por venda"}
                </Link>
              )}
            </div>
            {pdvCount === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-600">Sem vendas neste período.</p>
            ) : (
              <VendasTable sales={sales} saleItemsMap={saleItemsMap} showDetails={detalhes} />
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ABA OS (Ordens de Serviço)
  // ─────────────────────────────────────────────────────────────────────────
  const ano = params.ano ?? String(currentYear);
  const mes = params.mes ?? "";
  const dia = params.dia ?? "";
  const clienteId = params.cliente_id ?? "";

  const { start, end, label: periodoLabel } = buildDateRange(ano, mes, dia);

  // Build query
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

  // Compute totals
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

  // Top serviço/produto (OS items)
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

  // Group by day for month/year views
  const byDay: Record<string, typeof osWithTotals> = {};
  for (const o of osWithTotals) {
    const day = o.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(o);
  }
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
  const showGrouped = !dia;

  const daysInMonth = mes ? new Date(parseInt(ano), parseInt(mes), 0).getDate() : 31;
  const hasFilter = !!(mes || dia || clienteId);

  const printParams = new URLSearchParams({ aba: "os", ano });
  if (mes) printParams.set("mes", mes);
  if (dia) printParams.set("dia", dia);
  if (clienteId) printParams.set("cliente_id", clienteId);
  if (detalhes) printParams.set("detalhes", "1");
  const printHref = `/relatorios/imprimir?${printParams.toString()}`;

  // Toggle href for OS
  const baseOSParams = new URLSearchParams({ aba: "os", ano });
  if (mes) baseOSParams.set("mes", mes);
  if (dia) baseOSParams.set("dia", dia);
  if (clienteId) baseOSParams.set("cliente_id", clienteId);
  const toggleOSHref = detalhes
    ? `/relatorios?${baseOSParams.toString()}`
    : `/relatorios?${new URLSearchParams({ ...Object.fromEntries(baseOSParams), detalhes: "1" }).toString()}`;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl">
        <PageHeader aba={aba} printHref={printHref} />

        {/* Filtros */}
        <form method="GET" action="/relatorios" className="mb-6">
          <input type="hidden" name="aba" value="os" />
          {detalhes && <input type="hidden" name="detalhes" value="1" />}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ano</label>
              <select name="ano" defaultValue={ano} className={selectCls}>
                {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mês</label>
              <select name="mes" defaultValue={mes} className={selectCls}>
                <option value="">Todos</option>
                {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dia</label>
              <select name="dia" defaultValue={dia} className={selectCls}>
                <option value="">Todos</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{String(d).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente</label>
              <select name="cliente_id" defaultValue={clienteId} className={`${selectCls} max-w-[200px]`}>
                <option value="">Todos os clientes</option>
                {(clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-brand-yellow text-brand-black text-sm font-semibold rounded-lg hover:bg-yellow-400 transition-colors">
              Filtrar
            </button>
            {hasFilter && (
              <Link href="/relatorios?aba=os" className="px-4 py-2 border border-brand-gray-mid text-gray-400 text-sm rounded-lg hover:border-gray-400 transition-colors">
                Limpar
              </Link>
            )}
          </div>
        </form>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total OS", value: String(osCount), color: "text-blue-400" },
            { label: "Faturado", value: formatCurrency(totalFaturado), color: "text-green-400" },
            { label: "Ticket médio OS", value: formatCurrency(ticketMedio), color: "text-brand-yellow" },
            { label: "Canceladas", value: String(statusCount["cancelled"] ?? 0), color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5">
              <div className="text-xs text-gray-500 mb-2">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Rankings */}
        {(topClienteOS || topServico) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {topClienteOS && (
              <div className="bg-brand-gray-dark border border-brand-yellow/30 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">🏆 Cliente com mais OS</div>
                <div className="text-white font-semibold text-lg truncate">{topClienteOS[1].name}</div>
                <div className="text-brand-yellow text-sm mt-0.5">{formatCurrency(topClienteOS[1].total)}</div>
              </div>
            )}
            {topServico && (
              <div className="bg-brand-gray-dark border border-brand-yellow/30 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">🔧 Serviço/produto mais pedido</div>
                <div className="text-white font-semibold text-lg truncate">{topServico[0]}</div>
                <div className="text-gray-400 text-sm mt-0.5">{topServico[1].qty} un</div>
              </div>
            )}
          </div>
        )}

        {/* Status breakdown */}
        {Object.keys(statusCount).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(statusCount)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
                    OS_STATUS_COLORS[status as OSStatus] ?? "bg-gray-500/20 text-gray-300"
                  }`}
                >
                  {OS_STATUS_LABELS[status as OSStatus] ?? status}
                  <span className="font-bold">{count}</span>
                </span>
              ))}
          </div>
        )}

        {/* Top serviços/produtos em OS */}
        {topServicos.length > 0 && (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-6">
            <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
              Serviços/Produtos mais solicitados (OS)
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-5 py-2">#</th>
                  <th className="text-left px-5 py-2">Descrição</th>
                  <th className="text-right px-5 py-2">Qtd</th>
                  <th className="text-right px-5 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {topServicos.map(([desc, { qty, total }], i) => (
                  <tr key={desc} className="border-t border-brand-gray-mid hover:bg-white/5">
                    <td className="px-5 py-2.5 text-gray-500 w-8">{i + 1}</td>
                    <td className="px-5 py-2.5 text-white">{desc}</td>
                    <td className="px-5 py-2.5 text-right text-gray-300">{qty}</td>
                    <td className="px-5 py-2.5 text-right text-brand-yellow font-medium">{formatCurrency(total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Período label + toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-400">
            {osCount === 0 ? (
              <span>Nenhuma OS em <span className="text-white font-medium">{periodoLabel}</span></span>
            ) : (
              <span>
                <span className="text-white font-medium">{osCount}</span> OS em{" "}
                <span className="text-white font-medium">{periodoLabel}</span>
                {clienteId && clientes && (
                  <span className="ml-1">
                    — {clientes.find((c) => c.id === clienteId)?.name ?? ""}
                  </span>
                )}
              </span>
            )}
          </div>
          {osCount > 0 && (
            <Link
              href={toggleOSHref}
              className={`text-xs px-3 py-1 rounded border transition-colors ${
                detalhes
                  ? "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/50"
                  : "border-brand-gray-mid text-gray-400 hover:border-gray-400"
              }`}
            >
              {detalhes ? "▾ Ocultar itens" : "▸ Ver itens por OS"}
            </Link>
          )}
        </div>

        {/* OS list */}
        {osCount === 0 ? (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-5 py-10 text-center text-gray-600 text-sm">
            Nenhuma OS encontrada para este período.
          </div>
        ) : showGrouped ? (
          <div className="space-y-4">
            {days.map((day) => {
              const dayOS = byDay[day];
              const dayTotal = dayOS.reduce((s, o) => s + o.computed_total, 0);
              return (
                <div key={day} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
                  <div className="px-5 py-2.5 bg-brand-gray-mid/40 flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-300 capitalize">
                      {fmtDay(day + "T12:00:00")}
                    </span>
                    <span className="text-sm font-bold text-brand-yellow">{formatCurrency(dayTotal)}</span>
                  </div>
                  <OSTable rows={dayOS} showDetails={detalhes} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
            <OSTable rows={osWithTotals} showDetails={detalhes} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PageHeader({ aba, printHref }: { aba: "vendas" | "os"; printHref: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-white">Relatórios</h1>
      <div className="flex items-center gap-3">
        <a
          href={printHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-3 py-1.5 rounded-lg border border-brand-gray-mid text-gray-400 hover:border-gray-400 hover:text-white transition-colors"
        >
          Imprimir
        </a>
        <div className="flex gap-1 p-1 bg-brand-gray-dark border border-brand-gray-mid rounded-lg">
          <Link
            href="/relatorios?aba=vendas"
            className={`text-sm px-4 py-1.5 rounded-md transition-colors font-medium ${
              aba === "vendas"
                ? "bg-brand-yellow text-brand-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Vendas PDV
          </Link>
          <Link
            href="/relatorios?aba=os"
            className={`text-sm px-4 py-1.5 rounded-md transition-colors font-medium ${
              aba === "os"
                ? "bg-brand-yellow text-brand-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Ordens de Serviço
          </Link>
        </div>
      </div>
    </div>
  );
}

function OSTable({ rows, showDetails }: { rows: any[]; showDetails?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-brand-gray-mid">
            <th className="text-left px-5 py-2.5">Nº</th>
            <th className="text-left px-5 py-2.5">Data</th>
            <th className="text-left px-5 py-2.5">Cliente</th>
            <th className="text-left px-5 py-2.5 hidden md:table-cell">Equipamento</th>
            <th className="text-left px-5 py-2.5">Status</th>
            <th className="text-right px-5 py-2.5">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.flatMap((o) => [
            <tr key={o.id} className="border-t border-brand-gray-mid hover:bg-white/5">
              <td className="px-5 py-3">
                <Link href={`/os/${o.id}`} className="text-brand-yellow font-mono hover:underline">
                  NT-{String(o.number).padStart(5, "0")}
                </Link>
              </td>
              <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{fmtDate(o.created_at)}</td>
              <td className="px-5 py-3 text-white max-w-[160px] truncate">
                {(o.erp_customers as any)?.name ?? "—"}
              </td>
              <td className="px-5 py-3 text-gray-400 max-w-[140px] truncate hidden md:table-cell">
                {o.equipment ?? "—"}
              </td>
              <td className="px-5 py-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    OS_STATUS_COLORS[o.status as OSStatus] ?? "bg-gray-500/20 text-gray-300"
                  }`}
                >
                  {OS_STATUS_LABELS[o.status as OSStatus] ?? o.status}
                </span>
              </td>
              <td className="px-5 py-3 text-right font-medium text-white">
                {formatCurrency(o.computed_total)}
              </td>
            </tr>,
            ...(showDetails
              ? (o.erp_service_order_items ?? []).map((item: any, idx: number) => (
                  <tr key={`${o.id}-item-${idx}`} className="border-t border-brand-gray-mid/30 bg-white/[0.02]">
                    <td className="pl-10 pr-2 py-1.5 text-xs text-gray-600">↳</td>
                    <td />
                    <td colSpan={3} className="px-2 py-1.5 text-xs text-gray-400">
                      {item.description} — {item.quantity}× {formatCurrency(item.unit_price ?? 0)}
                    </td>
                    <td className="px-5 py-1.5 text-xs text-right text-gray-400">
                      {formatCurrency((item.quantity ?? 1) * (item.unit_price ?? 0))}
                    </td>
                  </tr>
                ))
              : []),
          ])}
        </tbody>
      </table>
    </div>
  );
}

function VendasTable({
  sales,
  saleItemsMap,
  showDetails,
}: {
  sales: any[];
  saleItemsMap: Record<string, any[]>;
  showDetails?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-brand-gray-mid">
            <th className="text-left px-5 py-2.5">Nº</th>
            <th className="text-left px-5 py-2.5">Data</th>
            <th className="text-left px-5 py-2.5">Cliente</th>
            <th className="text-right px-5 py-2.5">Total</th>
          </tr>
        </thead>
        <tbody>
          {sales.flatMap((s: any) => [
            <tr key={s.id} className="border-t border-brand-gray-mid hover:bg-white/5">
              <td className="px-5 py-3 font-mono text-brand-yellow font-bold">
                <Link href={`/pdv/${s.id}/recibo`} className="hover:underline">
                  #{String(s.sale_number).padStart(6, "0")}
                </Link>
              </td>
              <td className="px-5 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(s.created_at)}</td>
              <td className="px-5 py-3 text-gray-300 max-w-[180px] truncate">
                {(s.erp_customers as any)?.name ?? <span className="text-gray-600">—</span>}
              </td>
              <td className="px-5 py-3 text-right font-semibold text-green-400">
                {formatCurrency(s.total)}
              </td>
            </tr>,
            ...(showDetails
              ? (saleItemsMap[s.id] ?? []).map((item: any, idx: number) => (
                  <tr key={`${s.id}-item-${idx}`} className="border-t border-brand-gray-mid/30 bg-white/[0.02]">
                    <td className="pl-10 pr-2 py-1.5 text-xs text-gray-600">↳</td>
                    <td colSpan={2} className="px-2 py-1.5 text-xs text-gray-400">
                      {item.description} — {item.quantity}× {formatCurrency(item.unit_price ?? 0)}
                    </td>
                    <td className="px-5 py-1.5 text-xs text-right text-gray-400">
                      {formatCurrency(item.subtotal ?? (item.quantity ?? 1) * (item.unit_price ?? 0))}
                    </td>
                  </tr>
                ))
              : []),
          ])}
        </tbody>
      </table>
    </div>
  );
}
