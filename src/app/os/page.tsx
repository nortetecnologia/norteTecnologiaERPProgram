import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatOSNumber } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS, type ServiceOrder } from "@/types";

export default async function OSPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const { q, status } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("erp_service_orders")
    .select("*, erp_customers(name, phone)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: ordersRaw } = await query.returns<ServiceOrder[]>();
  const orders = ordersRaw ?? [];

  const statuses = ["awaiting", "in_progress", "done", "delivered", "cancelled"] as const;

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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href="/os"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!status ? "bg-brand-yellow text-brand-black border-brand-yellow font-bold" : "text-gray-400 border-brand-gray-mid hover:border-gray-400"}`}
          >
            Todas
          </Link>
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/os?status=${s}`}
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
