import { redirect, notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProdutoForm from "../../ProdutoForm";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const [{ data: product }, { data: categoriesRaw }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("categories").select("id, name").order("name"),
  ]);
  const categories = categoriesRaw ?? [];

  if (!product) notFound();

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Editar Produto</h1>
        <ProdutoForm categories={categories} product={product} />
      </div>
    </AppLayout>
  );
}
