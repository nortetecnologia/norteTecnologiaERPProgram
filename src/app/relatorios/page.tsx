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

function startOf(unit: "day" | "week" | "month") {
  const d = new Date();
  if (unit === "day") d.setHours(0, 0, 0, 0);
  else if (unit === "week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); }
  else { d.setDate(1); d.setHours(0, 0, 0, 0); }
  return d.toISOString();
}

function buildOSDateRange(ano: string, mes: string, dia: string) {
  const year = parseInt(ano) || new Date().getFullYear();
  if (mes && dia) {
    const m = parseInt(mes) - 1;
    const d = parseInt(dia);
    return {
      start: new Date(year, m, d, 0, 0, 0).toISOString(),
      end: new Date(year, m, d, 23, 59, 59).toISOString(),
      label: `${String(d).padStart(2, "0")}/${String(m + 1).padStart(2, "0")}/${year}`,
      granularity: "day" as const,
    };
  }
  if (mes) {
    const m = parseInt(mes) - 1;
    return {
      start: new Date(year, m, 1).toISOString(),
      end: new Date(year, m + 1, 0, 23, 59, 59).toISOString(),
      label: `${String(m + 1).padStart(2, "0")}/${year}`,
      granularity: "month" as const,
    };
  }
  return {
    start: new Date(year, 0, 1).toISOString(),
    end: new Date(year, 11, 31, 23, 59, 59).toISOString(),
    label: String(year),
    granularity: "year" as const,
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
    periodo?: string;
    ano?: string;
    mes?: string;
    dia?: string;
    cliente_id?: string;
  }>;
}) {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const aba = params.aba === "os" ? "os" : "vendas";

  const supabase = createAdminClient();

  // ── Clientes para o filtro ─────────────────────────────────────────────────
  const { data: clientes } = await supabase
    .from("erp_customers")
    .select("id, name")
    .order("name");

  // ─────────────────────────────────────────────────────────────────────────
  // ABA VENDAS (PDV)
  // ─────────────────────────────────────────────────────────────────────────
  if (aba === "vendas") {
    const { periodo = "mes" } = params;
    const unit = periodo === "hoje" ? "day" : periodo === "semana" ? "week" : "month";
    const since = startOf(unit);

    const [salesRes, paymentsRes, saleItemsRes, osRes, osStatusRes] =
      await Promise.all([
        supabase
          .from("erp_pdv_sales")
          .select("id, total, discount, created_at")
          .gte("created_at", since),
        supabase
          .from("erp_pdv_sale_payments")
          .select("method, amount, erp_pdv_sales!inner(created_at)")
          .gte("erp_pdv_sales.created_at", since),
        supabase
          .from("erp_pdv_sale_items")
          .select("description, quantity, subtotal, erp_pdv_sales!inner(created_at)")
          .gte("erp_pdv_sales.created_at", since),
        supabase
          .from("erp_service_orders")
          .select("id, labor_cost, discount, erp_service_order_items(quantity, unit_price)")
          .gte("created_at", since)
          .neq("status", "cancelled"),
        supabase
          .from("erp_service_orders")
          .select("status")
          .gte("created_at", since),
      ]);

    const sales = salesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    const saleItems = saleItemsRes.data ?? [];
    const osList = osRes.data ?? [];
    const osStatuses = osStatusRes.data ?? [];

    const pdvTotal = sales.reduce((s, v) => s + (v.total ?? 0), 0);
    const pdvCount = sales.length;
    const pdvTicket = pdvCount > 0 ? pdvTotal / pdvCount : 0;

    const osTotal = osList.reduce((s, o: any) => {
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
      statusCount[o.status] = (statusCount[o.status] ?? 0) + 1;
    }

    const periodos = [
      { value: "hoje", label: "Hoje" },
      { value: "semana", label: "Esta semana" },
      { value: "mes", label: "Este mês" },
    ];

    return (
      <AppLayout>
        <div className="p-6 max-w-5xl">
          <PageHeader aba={aba} />

          {/* Period filter */}
          <div className="flex gap-2 mb-6">
            {periodos.map((p) => (
              <Link
                key={p.value}
                href={`/relatorios?aba=vendas&periodo=${p.value}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  periodo === p.value
                    ? "bg-brand-yellow text-brand-black border-brand-yellow font-bold"
                    : "text-gray-400 border-brand-gray-mid hover:border-gray-400"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                OS ({osCount}) —{" "}
                <span className="text-gray-500 font-normal">
                  {periodo === "hoje" ? "hoje" : periodo === "semana" ? "esta semana" : "este mês"}
                </span>
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
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
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
        </div>
      </AppLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ABA OS (Ordens de Serviço)
  // ─────────────────────────────────────────────────────────────────────────
  const now = new Date();
  const ano = params.ano ?? String(now.getFullYear());
  const mes = params.mes ?? "";
  const dia = params.dia ?? "";
  const clienteId = params.cliente_id ?? "";

  const { start, end, label: periodoLabel } = buildOSDateRange(ano, mes, dia);

  // Build query
  let osQuery = supabase
    .from("erp_service_orders")
    .select(`
      id, number, title, status, equipment, labor_cost, discount, created_at,
      erp_customers(id, name),
      erp_service_order_items(quantity, unit_price)
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

  // Group by day for month/year views
  const byDay: Record<string, typeof osWithTotals> = {};
  for (const o of osWithTotals) {
    const day = o.created_at.slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(o);
  }
  const days = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
  const showGrouped = !dia; // group by day when not filtered by specific day

  // Years for selector (current year - 4 to current year)
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];
  const daysInMonth = mes
    ? new Date(parseInt(ano), parseInt(mes), 0).getDate()
    : 31;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl">
        <PageHeader aba={aba} />

        {/* Filtros */}
        <form method="GET" action="/relatorios" className="mb-6">
          <input type="hidden" name="aba" value="os" />
          <div className="flex flex-wrap gap-3 items-end">
            {/* Ano */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ano</label>
              <select
                name="ano"
                defaultValue={ano}
                className="bg-brand-gray-dark border border-brand-gray-mid text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-yellow"
              >
                {years.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            {/* Mês */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mês</label>
              <select
                name="mes"
                defaultValue={mes}
                className="bg-brand-gray-dark border border-brand-gray-mid text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-yellow"
              >
                <option value="">Todos</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Dia */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dia</label>
              <select
                name="dia"
                defaultValue={dia}
                className="bg-brand-gray-dark border border-brand-gray-mid text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-yellow"
              >
                <option value="">Todos</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{String(d).padStart(2, "0")}</option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cliente</label>
              <select
                name="cliente_id"
                defaultValue={clienteId}
                className="bg-brand-gray-dark border border-brand-gray-mid text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-yellow max-w-[200px]"
              >
                <option value="">Todos os clientes</option>
                {(clientes ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-brand-yellow text-brand-black text-sm font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Filtrar
            </button>

            {(mes || dia || clienteId) && (
              <Link
                href="/relatorios?aba=os"
                className="px-4 py-2 border border-brand-gray-mid text-gray-400 text-sm rounded-lg hover:border-gray-400 transition-colors"
              >
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

        {/* Período label */}
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
        </div>

        {/* OS list */}
        {osCount === 0 ? (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-5 py-10 text-center text-gray-600 text-sm">
            Nenhuma OS encontrada para este período.
          </div>
        ) : showGrouped ? (
          // Grouped by day
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
                  <OSTable rows={dayOS} />
                </div>
              );
            })}
          </div>
        ) : (
          // Single view (day filter)
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
            <OSTable rows={osWithTotals} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function PageHeader({ aba }: { aba: "vendas" | "os" }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-white">Relatórios</h1>
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
  );
}

function OSTable({ rows }: { rows: any[] }) {
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
          {rows.map((o) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
