import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";
import AjusteEstoqueForm from "./AjusteEstoqueForm";

export default async function EstoquePage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();

  const [allProductsRes, lowStockRes, noImageRes, noSkuRes, recentMovRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, stock")
      .eq("is_active", true)
      .eq("product_type", "product")
      .order("name")
      .limit(500),
    supabase
      .from("products")
      .select("id, name, sku, stock, price, categories(name)")
      .eq("is_active", true)
      .eq("product_type", "product")
      .lt("stock", 5)
      .order("stock")
      .limit(50)
      .returns<Product[]>(),
    supabase
      .from("products")
      .select("id, name, sku, stock, is_active")
      .eq("product_type", "product")
      .or("images.is.null,images.eq.{}")
      .limit(50)
      .returns<Product[]>(),
    supabase
      .from("products")
      .select("id, name, stock, is_active")
      .eq("product_type", "product")
      .is("sku", null)
      .limit(50)
      .returns<Product[]>(),
    supabase
      .from("erp_stock_movements")
      .select("id, type, quantity, reason, created_at, products(name, sku)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const allProducts = allProductsRes.data ?? [];
  const lowStock = lowStockRes.data ?? [];
  const noImage = noImageRes.data ?? [];
  const noSku = noSkuRes.data ?? [];
  const recentMov = recentMovRes.data ?? [];

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Estoque</h1>
          <AjusteEstoqueForm products={allProducts as any} />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Estoque crítico (< 5)", count: lowStock.length, color: "text-red-400", icon: "⚠️" },
            { label: "Sem imagem", count: noImage.length, color: "text-yellow-400", icon: "🖼" },
            { label: "Sem SKU", count: noSku.length, color: "text-gray-400", icon: "🏷" },
          ].map((s) => (
            <div key={s.label} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <span>{s.icon}</span> {s.label}
              </div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.count}</div>
            </div>
          ))}
        </div>

        {/* Low stock table */}
        {lowStock.length > 0 && (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-6">
            <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
              ⚠️ Estoque crítico — produtos com menos de 5 unidades
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-5 py-2">Produto</th>
                  <th className="text-left px-5 py-2 hidden md:table-cell">SKU</th>
                  <th className="text-right px-5 py-2">Estoque</th>
                  <th className="text-right px-5 py-2 hidden md:table-cell">Preço</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id} className="border-t border-brand-gray-mid hover:bg-white/5">
                    <td className="px-5 py-2.5 text-white">{p.name}</td>
                    <td className="px-5 py-2.5 text-gray-500 hidden md:table-cell">{p.sku || "—"}</td>
                    <td className={`px-5 py-2.5 text-right font-bold ${p.stock === 0 ? "text-red-400" : "text-yellow-400"}`}>
                      {p.stock}
                    </td>
                    <td className="px-5 py-2.5 text-right text-gray-300 hidden md:table-cell">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/produtos/${p.id}/editar`} className="text-xs text-gray-400 hover:text-brand-yellow">
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent movements */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
          <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
            Últimas movimentações
          </div>
          {recentMov.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-600">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="divide-y divide-brand-gray-mid">
              {recentMov.map((m: any) => (
                <div key={m.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white">{m.products?.name ?? "—"}</span>
                    <span className="text-xs text-gray-500 ml-2">{m.reason}</span>
                  </div>
                  <span className={`text-sm font-bold ${m.type === "in" ? "text-green-400" : m.type === "out" ? "text-red-400" : "text-gray-400"}`}>
                    {m.type === "in" ? "+" : m.type === "out" ? "-" : "±"}{m.quantity}
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
