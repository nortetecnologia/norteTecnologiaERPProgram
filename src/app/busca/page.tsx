import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatOSNumber, formatPhone } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS } from "@/types";
import { shouldUseLocalData, readOfflineData } from "@/lib/offline";

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let customers: any[] = [];
  let orders: any[] = [];
  let products: any[] = [];

  if (query.length >= 2) {
    if (shouldUseLocalData()) {
      const d = readOfflineData();
      const qLow = query.toLowerCase();
      const qNum = parseInt(query);
      const allCustomers = (d["erp_customers"] ?? []) as any[];
      const allOrders = (d["erp_service_orders"] ?? []) as any[];
      const allProducts = (d["products"] ?? []) as any[];

      customers = allCustomers
        .filter((c) =>
          c.name?.toLowerCase().includes(qLow) ||
          c.phone?.includes(query) ||
          c.cpf_cnpj?.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
        )
        .slice(0, 5);

      orders = allOrders
        .filter((o) =>
          o.title?.toLowerCase().includes(qLow) ||
          o.equipment?.toLowerCase().includes(qLow) ||
          o.serial_number?.toLowerCase().includes(qLow) ||
          (!isNaN(qNum) && o.number === qNum)
        )
        .sort((a, b) => b.created_at?.localeCompare(a.created_at))
        .slice(0, 5)
        .map((o) => ({
          ...o,
          erp_customers: allCustomers.find((c) => c.id === o.customer_id) ?? null,
        }));

      products = allProducts
        .filter((p) =>
          p.name?.toLowerCase().includes(qLow) ||
          p.sku?.toLowerCase().includes(qLow) ||
          p.barcode?.toLowerCase().includes(qLow)
        )
        .slice(0, 5);
    } else {
      const supabase = createAdminClient();
      const qNum = parseInt(query);
      const osOrParts = [`title.ilike.%${query}%`, `equipment.ilike.%${query}%`, `serial_number.ilike.%${query}%`];
      if (!isNaN(qNum)) osOrParts.push(`number.eq.${qNum}`);

      const [custRes, osRes, prodRes] = await Promise.all([
        supabase
          .from("erp_customers")
          .select("id, name, phone, cpf_cnpj")
          .or(`name.ilike.%${query}%,phone.ilike.%${query}%,cpf_cnpj.ilike.%${query}%`)
          .limit(5),
        supabase
          .from("erp_service_orders")
          .select("id, number, title, equipment, serial_number, status, created_at, erp_customers(name)")
          .or(osOrParts.join(","))
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("products")
          .select("id, name, sku, barcode, stock, price")
          .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
          .limit(5),
      ]);
      customers = custRes.data ?? [];
      orders = osRes.data ?? [];
      products = prodRes.data ?? [];
    }
  }

  const total = customers.length + orders.length + products.length;
  const inputCls =
    "bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-yellow w-full";

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Busca universal</h1>

        {/* Search form */}
        <form method="get" className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Buscar clientes, OS, produtos..."
              className={inputCls}
              autoFocus
              autoComplete="off"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-brand-yellow text-brand-dark rounded-lg text-sm font-bold hover:bg-brand-yellow/90 transition-colors whitespace-nowrap"
            >
              Buscar
            </button>
          </div>
          {query.length > 0 && query.length < 2 && (
            <p className="text-xs text-gray-500 mt-2">Digite ao menos 2 caracteres.</p>
          )}
        </form>

        {query.length >= 2 && (
          <>
            {total === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Nenhum resultado para <span className="text-white">&quot;{query}&quot;</span>.
              </div>
            ) : (
              <div className="text-xs text-gray-500 mb-4">
                {total} resultado(s) para <span className="text-white">&quot;{query}&quot;</span>
              </div>
            )}

            {/* Clientes */}
            {customers.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Clientes ({customers.length})
                </h2>
                <div className="space-y-1">
                  {customers.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/clientes/${c.id}`}
                      className="flex items-center justify-between bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-3 hover:border-brand-yellow/50 transition-colors"
                    >
                      <div>
                        <div className="text-sm text-white font-medium">{c.name}</div>
                        <div className="text-xs text-gray-500">
                          {c.phone ? formatPhone(c.phone) : ""}
                          {c.cpf_cnpj ? ` · ${c.cpf_cnpj}` : ""}
                        </div>
                      </div>
                      <span className="text-xs text-gray-600">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Ordens de Serviço */}
            {orders.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Ordens de Serviço ({orders.length})
                </h2>
                <div className="space-y-1">
                  {orders.map((os: any) => (
                    <Link
                      key={os.id}
                      href={`/os/${os.id}`}
                      className="flex items-center gap-3 bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-3 hover:border-brand-yellow/50 transition-colors"
                    >
                      <span className="font-mono text-sm text-brand-yellow font-bold w-20 shrink-0">
                        {formatOSNumber(os.number)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{os.title}</div>
                        <div className="text-xs text-gray-500">
                          {(os.erp_customers as any)?.name ?? ""}
                          {os.equipment ? ` · ${os.equipment}` : ""}
                          {os.serial_number ? ` · S/N: ${os.serial_number}` : ""}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${OS_STATUS_COLORS[os.status as keyof typeof OS_STATUS_COLORS] ?? ""}`}>
                        {OS_STATUS_LABELS[os.status as keyof typeof OS_STATUS_LABELS] ?? os.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Produtos */}
            {products.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Produtos ({products.length})
                </h2>
                <div className="space-y-1">
                  {products.map((p: any) => (
                    <Link
                      key={p.id}
                      href={`/produtos/${p.id}`}
                      className="flex items-center justify-between bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-3 hover:border-brand-yellow/50 transition-colors"
                    >
                      <div>
                        <div className="text-sm text-white font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">
                          {p.sku ? `SKU: ${p.sku}` : ""}
                          {p.barcode ? ` · ${p.barcode}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className={`text-sm font-bold ${(p.stock ?? 0) < 5 ? "text-red-400" : "text-gray-300"}`}>
                          {p.stock ?? 0} un.
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {!query && (
          <div className="text-center py-12 text-gray-600">
            <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-sm">Busque por clientes, OS, produtos ou número de série.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
