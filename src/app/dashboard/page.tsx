import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { extractRole } from "@/lib/auth";

export default async function DashboardPage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const role = extractRole(user.app_metadata);

  const supabase = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const [salesRes, osRes, stockRes, recentSalesRes] = await Promise.all([
    supabase
      .from("erp_pdv_sales")
      .select("total")
      .gte("created_at", todayISO),
    supabase
      .from("erp_service_orders")
      .select("id", { count: "exact" })
      .in("status", ["awaiting", "in_progress"]),
    supabase
      .from("products")
      .select("id", { count: "exact" })
      .lt("stock", 5)
      .eq("is_active", true)
      .eq("product_type", "product"),
    supabase
      .from("erp_pdv_sales")
      .select("id, sale_number, total, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const todaySalesTotal = (salesRes.data ?? []).reduce(
    (sum, s) => sum + (s.total ?? 0),
    0
  );
  const openOS = osRes.count ?? 0;
  const lowStock = stockRes.count ?? 0;
  const recentSales = recentSalesRes.data ?? [];

  const stats = [
    { label: "Vendas hoje", value: formatCurrency(todaySalesTotal), icon: "💰", color: "text-green-400", href: "/pdv" },
    { label: "OS abertas", value: String(openOS), icon: "🔧", color: "text-blue-400", href: "/os" },
    { label: "Estoque crítico", value: String(lowStock), icon: "⚠️", color: "text-yellow-400", href: "/estoque" },
  ];

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${role === "admin" ? "bg-brand-yellow/20 text-brand-yellow" : "bg-gray-700 text-gray-400"}`}>
            {role === "admin" ? "Admin" : "Operador"}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 hover:border-brand-yellow/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-sm text-gray-400">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        {(() => {
          const actions = [
            {
              href: "/pdv",
              label: "Nova Venda",
              adminOnly: false,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
                </svg>
              ),
            },
            {
              href: "/os/nova",
              label: "Nova OS",
              adminOnly: false,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
                </svg>
              ),
            },
            {
              href: "/clientes/novo",
              label: "Novo Cliente",
              adminOnly: false,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                  <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="10" x2="12" y2="12"/>
                </svg>
              ),
            },
            {
              href: "/produtos/novo",
              label: "Novo Produto",
              adminOnly: false,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
              ),
            },
            {
              href: "/configuracoes",
              label: "Configurações",
              adminOnly: true,
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              ),
            },
          ].filter((a) => !a.adminOnly || role === "admin");

          return (
            <div className={`grid gap-3 mb-8 ${actions.length === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
              {actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="bg-brand-gray-dark hover:bg-brand-gray-mid border border-brand-gray-mid rounded-lg p-4 text-center transition-colors group"
                >
                  <div className="flex justify-center mb-2 text-[#6b7280] group-hover:text-brand-yellow transition-colors">
                    {action.icon}
                  </div>
                  <div className="text-xs text-[#9ca3af] font-medium group-hover:text-white transition-colors">{action.label}</div>
                </Link>
              ))}
            </div>
          );
        })()}

        {/* Recent sales */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">Últimas vendas PDV</h2>
          {recentSales.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhuma venda registrada.</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b border-brand-gray-mid last:border-0"
                >
                  <div>
                    <span className="text-sm text-white font-medium">
                      Venda #{sale.sale_number}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatDateTime(sale.created_at)}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-green-400">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
