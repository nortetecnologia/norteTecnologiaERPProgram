import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; de?: string; ate?: string }>;
}) {
  await requireAuth();

  const { q, de, ate } = await searchParams;

  const supabase = createAdminClient();

  let query = supabase
    .from("erp_pdv_sales")
    .select(
      "id, sale_number, total, discount, created_at, customer_id, customer_name, erp_customers(name), erp_pdv_sale_items(description)"
    )
    .eq("type", "quote")
    .order("created_at", { ascending: false })
    .limit(500);

  if (de) query = query.gte("created_at", de + "T00:00:00");
  if (ate) query = query.lte("created_at", ate + "T23:59:59");

  const { data: rawQuotes } = await query;
  const quotes = (rawQuotes ?? []) as any[];

  // Client-side text filter: match sale_number, customer name or items
  const filtered = q
    ? quotes.filter((s: any) => {
        const num = `NT-${String(s.sale_number).padStart(5, "0")}`;
        const numAlt = `#${s.sale_number}`;
        const customerDisplay =
          s.customer_name ?? s.erp_customers?.name ?? "Consumidor final";
        const items: string[] = (s.erp_pdv_sale_items ?? []).map(
          (i: any) => i.description ?? ""
        );
        const haystack = [num, numAlt, customerDisplay, ...items]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
    : quotes;

  const total = filtered.reduce((sum: number, s: any) => sum + (s.total ?? 0), 0);

  const inputCls =
    "bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Orçamentos</h1>
            <p className="text-xs text-gray-500 mt-1">
              {filtered.length} orçamento(s) · Total estimado {formatCurrency(total)}
            </p>
          </div>
          <Link
            href="/pdv"
            className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-300 rounded-lg hover:border-gray-400 transition-colors"
          >
            ← Voltar ao PDV
          </Link>
        </div>

        {/* Filters */}
        <form
          method="get"
          className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Buscar (nº, cliente, item)
              </label>
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="NT-00001, nome do cliente..."
                className={inputCls + " w-full"}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">De</label>
              <input
                type="date"
                name="de"
                defaultValue={de ?? ""}
                className={inputCls + " w-full"}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Até</label>
              <input
                type="date"
                name="ate"
                defaultValue={ate ?? ""}
                className={inputCls + " w-full"}
              />
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
              href="/pdv/orcamentos"
              className="px-4 py-1.5 bg-brand-gray-mid text-gray-300 rounded text-sm hover:bg-white/10 transition-colors"
            >
              Limpar
            </a>
          </div>
        </form>

        {/* Table */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-sm">
              Nenhum orçamento encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-gray-mid text-xs text-gray-500">
                  <th className="text-left px-4 py-3">Nº</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Itens</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Data</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => {
                  const num = `NT-${String(s.sale_number).padStart(5, "0")}`;
                  const customerName =
                    s.customer_name ?? s.erp_customers?.name ?? "Consumidor final";
                  const items: string[] = (s.erp_pdv_sale_items ?? []).map(
                    (i: any) => i.description
                  );
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-brand-gray-mid last:border-0 hover:bg-brand-gray-mid/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-brand-yellow font-bold text-xs">
                        {num}
                      </td>
                      <td className="px-4 py-3 text-white">{customerName}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell max-w-xs truncate">
                        {items.slice(0, 3).join(", ")}
                        {items.length > 3 && ` +${items.length - 3}`}
                      </td>
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell text-xs">
                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-white">
                        {formatCurrency(s.total ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/pdv/${s.id}/recibo`}
                          className="text-xs text-brand-yellow hover:underline"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
