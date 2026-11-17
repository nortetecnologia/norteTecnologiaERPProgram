import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatOSNumber } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS, type ServiceOrder } from "@/types";
import { requireAuth } from "@/lib/auth";
import { getCachedServiceOrders, getCachedCustomers } from "@/lib/queries";

export default async function OSPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; cliente?: string; de?: string; ate?: string }>;
}) {
  await requireAuth();
  const { q, status, cliente, de, ate } = await searchParams;

  const customersRaw = await getCachedCustomers();
  const customers = (customersRaw as any[]).map((c: any) => ({ id: c.id, name: c.name }));

  let orders: ServiceOrder[];
  const hasAdvancedFilter = q || cliente || de || ate;
  if (hasAdvancedFilter) {
    const supabase = createAdminClient();
    let query = supabase
      .from("erp_service_orders")
      .select("*, erp_customers(name, phone)")
      .order("created_at", { ascending: false })
      .limit(200);

    if (status) query = query.eq("status", status);
    if (q) query = query.ilike("title", `%${q}%`);
    if (cliente) query = query.eq("customer_id", cliente);
    if (de) query = query.gte("created_at", de + "T00:00:00");
    if (ate) query = query.lte("created_at", ate + "T23:59:59");

    const { data } = await query.returns<ServiceOrder[]>();
    orders = data ?? [];
  } else {
    orders = (await getCachedServiceOrders(status)) as ServiceOrder[];
  }

  const statuses = ["awaiting", "in_progress", "done", "delivered", "cancelled"] as const;

  const inputCls =
    "bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

  function statusHref(s?: string) {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
    if (q) params.set("q", q);
    if (cliente) params.set("cliente", cliente);
    if (de) params.set("de", de);
    if (ate) params.set("ate", ate);
    const str = params.toString();
    return `/os${str ? `?${str}` : ""}`;
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Ordens de Serviço</h1>
          <Link
            href="/os/nova"
            className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            + Nova OS
          </Link>
        </div>

        {/* Advanced filters */}
        <form method="get" className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-4">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Busca (título)</label>
              <input type="text" name="q" defaultValue={q ?? ""} placeholder="Buscar..." className={inputCls + " w-full"} />
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
            <button type="submit" className="px-4 py-1.5 bg-brand-yellow text-brand-dark rounded text-sm font-medium hover:bg-brand-yellow/90 transition-colors">
              Filtrar
            </button>
            <a href="/os" className="px-4 py-1.5 bg-brand-gray-mid text-gray-300 rounded text-sm hover:bg-white/10 transition-colors">
              Limpar
            </a>
          </div>
        </form>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href={statusHref()}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!status ? "bg-brand-yellow text-brand-black border-brand-yellow font-bold" : "text-gray-400 border-brand-gray-mid hover:border-gray-400"}`}
          >
            Todas
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={statusHref(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${status === s ? "bg-brand-yellow text-brand-black border-brand-yellow font-bold" : "text-gray-400 border-brand-gray-mid hover:border-gray-400"}`}
            >
              {OS_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Nenhuma OS encontrada.</div>
        ) : (
          <div className="space-y-2">
            {orders.map((os) => (
              <Link
                key={os.id}
                href={`/os/${os.id}`}
                className="flex items-center gap-4 bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-5 py-4 hover:border-brand-yellow/50 transition-colors"
              >
                <div className="font-mono text-sm text-brand-yellow font-bold w-20 shrink-0">
                  {formatOSNumber(os.number)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{os.title}</div>
                  <div className="text-xs text-gray-500">
                    {(os.erp_customers as any)?.name ?? "Cliente não encontrado"}
                    {os.equipment && ` · ${os.equipment}`}
                  </div>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${OS_STATUS_COLORS[os.status]}`}>
                  {OS_STATUS_LABELS[os.status]}
                </div>
                <div className="text-xs text-gray-500 shrink-0 hidden md:block">
                  {formatDate(os.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
