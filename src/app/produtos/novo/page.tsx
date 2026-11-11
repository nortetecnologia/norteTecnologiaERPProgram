import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProdutoForm from "../ProdutoForm";

export default async function NovoProdutoPage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: categoriesRaw } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");
  const categories = categoriesRaw ?? [];

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Novo Produto / Serviço</h1>
        <ProdutoForm categories={categories} />
      </div>
    </AppLayout>
  );
}
