import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("products")
    .select("id, name, sku, price, stock, is_active, product_images(url, is_primary)")
    .order("name")
    .limit(200);

  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);

  const { data: productsRaw, error: productsError } = await query;
  if (productsError) console.error("[produtos] query error:", productsError.message);
  const products = productsRaw ?? [];

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Produtos e Serviços</h1>
          <Link
            href="/produtos/novo"
            className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            + Novo
          </Link>
        </div>

        {/* Search */}
        <form className="mb-5">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou SKU..."
            className="w-full max-w-md bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
          />
        </form>

        {/* Table */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-gray-mid text-xs text-gray-500 uppercase">
                <th className="text-left px-5 py-3">Nome</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">SKU</th>
                <th className="text-right px-5 py-3">Preço</th>
                <th className="text-right px-5 py-3 hidden md:table-cell">Estoque</th>
                <th className="text-center px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {productsError ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-red-400 text-xs px-5">
                    Erro ao carregar produtos: {productsError.message}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id} className="border-t border-brand-gray-mid hover:bg-brand-gray-mid/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {(p.product_images?.find((i: any) => i.is_primary)?.url ?? p.product_images?.[0]?.url) ? (
                          <img src={p.product_images?.find((i: any) => i.is_primary)?.url ?? p.product_images[0].url} alt={p.name} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-brand-gray-mid rounded-lg shrink-0 flex items-center justify-center text-gray-600 text-xs">📦</div>
                        )}
                        <div>
                          <div className="text-white font-medium">{p.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-400 hidden md:table-cell">{p.sku ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-white">{formatCurrency(p.price)}</td>
                    <td className={`px-5 py-3 text-right hidden md:table-cell ${(p.stock ?? 0) < 5 ? "text-red-400" : "text-gray-300"}`}>
                      {p.stock ?? 0}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-900/30 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                        {p.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/produtos/${p.id}/editar`}
                        className="text-xs text-gray-400 hover:text-brand-yellow transition-colors"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
