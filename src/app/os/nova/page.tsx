import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OSForm from "./OSForm";

export default async function NovaOSPage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: customersRaw } = await supabase
    .from("erp_customers")
    .select("id, name, phone")
    .order("name");

  const { data: productsRaw } = await supabase
    .from("products")
    .select("id, name, price, sku")
    .eq("active", true)
    .order("name");

  const customers = customersRaw ?? [];
  const products = productsRaw ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
        </div>
        <OSForm customers={customers} products={products} />
      </div>
    </AppLayout>
  );
}
