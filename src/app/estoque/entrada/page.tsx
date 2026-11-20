import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { requireAuth } from "@/lib/auth";
import { shouldUseLocalData, readOfflineData } from "@/lib/offline";
import { createAdminClient } from "@/lib/supabase/admin";
import EntradaForm from "./EntradaForm";

export default async function EntradaMercadoriaPage() {
  await requireAuth();

  let products: Array<{ id: string; name: string; sku: string | null; stock: number }> = [];

  if (shouldUseLocalData()) {
    const d = readOfflineData();
    products = ((d["products"] ?? []) as any[])
      .filter((p) => p.product_type !== "service" && p.is_active !== false)
      .map((p) => ({ id: p.id as string, name: p.name as string, sku: (p.sku as string) ?? null, stock: (p.stock as number) ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } else {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, stock")
      .eq("product_type", "product")
      .eq("is_active", true)
      .order("name");
    products = (data ?? []) as typeof products;
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Link href="/estoque" className="hover:text-brand-yellow transition-colors">
            Estoque
          </Link>
          <span>›</span>
          <span className="text-gray-300">Entrada de mercadoria</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">Entrada de mercadoria</h1>
        <p className="text-sm text-gray-400 mb-6">
          Registre a entrada de produtos no estoque. O saldo de cada produto será atualizado automaticamente.
        </p>

        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-6">
          <EntradaForm products={products} />
        </div>
      </div>
    </AppLayout>
  );
}
