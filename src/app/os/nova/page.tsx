import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OSTabsView from "./OSTabsView";

export default async function NovaOSPage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const [{ data: customersRaw }, { data: productsRaw }, { data: employeesRaw }] = await Promise.all([
    supabase.from("erp_customers").select("id, name, phone").order("name"),
    supabase.from("products").select("id, name, price, sku, barcode, product_type").eq("is_active", true).order("name"),
    supabase.from("erp_employees").select("id, name").eq("is_active", true).order("name"),
  ]);

  const customers = customersRaw ?? [];
  const products = productsRaw ?? [];
  const employees = employeesRaw ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
          <Link href="/os" className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-500 rounded-lg hover:border-gray-400 transition-colors">
            ← Voltar
          </Link>
        </div>
        <OSTabsView customers={customers} products={products} employees={employees} />
      </div>
    </AppLayout>
  );
}
