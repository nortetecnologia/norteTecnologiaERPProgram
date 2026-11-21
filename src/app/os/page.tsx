import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { OS_STATUS_LABELS, type ServiceOrder } from "@/types";
import { requireAuth } from "@/lib/auth";
import { getCachedServiceOrders, getCachedCustomers } from "@/lib/queries";
import { shouldUseLocalData, readOfflineData } from "@/lib/offline";
import OSListClient from "./OSListClient";

export default async function OSPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cliente?: string; de?: string; ate?: string }>;
}) {
  await requireAuth();
  const { status, cliente, de, ate } = await searchParams;

  const customersRaw = await getCachedCustomers();
  const customers = (customersRaw as any[]).map((c: any) => ({ id: c.id, name: c.name }));

  let orders: ServiceOrder[];
  const hasAdvancedFilter = !!(cliente || de || ate);
  if (hasAdvancedFilter) {
    if (shouldUseLocalData()) {
      const d = readOfflineData();
      const allCustomers = (d["erp_customers"] ?? []) as any[];
      let rows = (d["erp_service_orders"] ?? []) as any[];
      if (status) rows = rows.filter((o: any) => o.status === status);
      if (cliente) rows = rows.filter((o: any) => o.customer_id === cliente);
      if (de) rows = rows.filter((o: any) => o.created_at >= de + "T00:00:00");
      if (ate) rows = rows.filter((o: any) => o.created_at <= ate + "T23:59:59");
      orders = rows
        .sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at))
        .slice(0, 500)
        .map((o: any) => ({ ...o, erp_customers: allCustomers.find((c: any) => c.id === o.customer_id) ?? null })) as ServiceOrder[];
    } else {
      const supabase = createAdminClient();
      let query = supabase
        .from("erp_service_orders")
        .select("*, erp_customers(name, phone)")
        .order("created_at", { ascending: false })
        .limit(500);

      if (status) query = query.eq("status", status);
      if (cliente) query = query.eq("customer_id", cliente);
      if (de) query = query.gte("created_at", de + "T00:00:00");
      if (ate) query = query.lte("created_at", ate + "T23:59:59");

      const { data } = await query.returns<ServiceOrder[]>();
      orders = data ?? [];
    }
  } else {
    orders = (await getCachedServiceOrders(status)) as ServiceOrder[];
  }

  const statuses = ["awaiting", "in_progress", "done", "delivered", "cancelled"] as const;

  const inputCls =
    "bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

  function statusHref(s?: string) {
    const params = new URLSearchParams();
    if (s) params.set("status", s);
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

        {/* Advanced filters (cliente, data) — text search is live in OSListClient below */}
        <form method="get" className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 mb-4">
          {status && <input type="hidden" name="status" value={status} />}
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
            <button type="submit" className="px-4 py-1.5 bg-brand-yellow text-brand-black rounded-lg text-sm font-bold hover:bg-brand-yellow-dark transition-colors">
              Filtrar
            </button>
            <a href="/os" className="px-4 py-1.5 bg-brand-gray-mid text-gray-300 rounded-lg text-sm hover:bg-white/10 transition-colors">
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

        <OSListClient orders={orders} />
      </div>
    </AppLayout>
  );
}
