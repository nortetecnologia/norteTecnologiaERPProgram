import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import VendasTable from "./VendasTable";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; de?: string; ate?: string }>;
}) {
  await requireAuth();

  const { cliente, de, ate } = await searchParams;

  const supabase = createAdminClient();

  const [{ data: customersRaw }] = await Promise.all([
    supabase.from("erp_customers").select("id, name").order("name"),
  ]);
  const customers = customersRaw ?? [];

  let query = supabase
    .from("erp_pdv_sales")
    .select("id, sale_number, total, discount, created_at, customer_id, erp_customers(name), erp_pdv_sale_items(description)")
    .eq("type", "sale")
    .order("created_at", { ascending: false })
    .limit(500);

  if (cliente) query = query.eq("customer_id", cliente);
  if (de) query = query.gte("created_at", de + "T00:00:00");
  if (ate) query = query.lte("created_at", ate + "T23:59:59");

  const { data: salesRaw } = await query;
  const sales = salesRaw ?? [];

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

        {/* Filters — only date + customer, no text search here */}
        <form method="get" className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* Client table with live search */}
        <VendasTable sales={sales as any} />
      </div>
    </AppLayout>
  );
}
