import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cliente?: string; de?: string; ate?: string }>;
}) {
  await requireAuth();

  const { q, cliente, de, ate } = await searchParams;

  const supabase = createAdminClient();

  const [{ data: customersRaw }] = await Promise.all([
    supabase.from("erp_customers").select("id, name").order("name"),
  ]);
  const customers = customersRaw ?? [];

  let query = supabase
    .from("erp_pdv_sales")
    .select("id, sale_number, total, discount, created_at, customer_id, erp_customers(name), erp_pdv_sale_items(description)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (cliente) query = query.eq("customer_id", cliente);
  if (de) query = query.gte("created_at", de + "T00:00:00");
  if (ate) query = query.lte("created_at", ate + "T23:59:59");

  const { data: salesRaw } = await query;
  let sales = salesRaw ?? [];

  if (q) {
    const term = q.toLowerCase();
    sales = sales.filter(
      (s: any) =>
        String(s.sale_number).includes(term) ||
        (s.erp_customers?.name ?? "").toLowerCase().includes(term) ||
        (s.erp_pdv_sale_items ?? []).some((i: any) => i.description?.toLowerCase().includes(term))
    );
  }

  const total = sales.reduce((sum: number, s: any) => sum + (s.total ?? 0), 0);

  const inputCls =
    "bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Histórico de Vendas</h1>
            <p className="text-xs text-gray-500 mt-1">{sales.length} venda(s) · Total {formatCurrency(total)}</p>
          </div>
          <Link
            href="/pdv"
            className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            ← Voltar ao PDV
          </Link>
        </div>

        {/* Filters */}
        <form method="get" className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Busca (nº, cliente, produto)</label>
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Buscar..."
                className={inputCls + " w-full"}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Cliente</label>
              <select name="cliente" defaultValue={cliente ?? ""} className={inputCls + " w-full"}>
                <option value="">Todos</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">De</label>
              <input type="date" name="de" defaultValue={de ?? ""} className={inputCls + " w-full"} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Até</label>
              <input type="date" name="ate" defaultValue={ate ?? ""} className={inputCls + " w-full"} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              className="px-4 py-1.5 bg-brand-yellow text-brand-dark rounded text-sm font-medium hover:bg-brand-yellow/90 transition-colors"
            >
              Filtrar
            </button>
            <a
              href="/pdv/vendas"
              className="px-4 py-1.5 bg-brand-gray-mid text-gray-300 rounded text-sm hover:bg-white/10 transition-colors"
            >
              Limpar
            </a>
          </div>
        </form>

        {/* Table */}
        {sales.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Nenhuma venda encontrada.</div>
        ) : (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-brand-gray-mid">
                  <th className="text-left px-5 py-3">Nº</th>
                  <th className="text-left px-5 py-3">Data</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-right px-5 py-3">Total</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale: any) => (
                  <tr key={sale.id} className="border-t border-brand-gray-mid hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 font-mono text-brand-yellow font-bold">
                      #{String(sale.sale_number).padStart(6, "0")}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(sale.created_at)}</td>
                    <td className="px-5 py-3 text-gray-300">
                      {(sale.erp_customers as any)?.name ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-green-400">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/pdv/${sale.id}/editar`}
                          className="text-xs px-2.5 py-1 border border-brand-gray-mid text-gray-400 rounded hover:border-gray-400 transition-colors"
                        >
                          ✏️ Editar
                        </Link>
                        <Link
                          href={`/pdv/${sale.id}/recibo`}
                          className="text-xs px-2.5 py-1 border border-brand-gray-mid text-gray-400 rounded hover:border-gray-400 transition-colors"
                        >
                          Ver recibo
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
