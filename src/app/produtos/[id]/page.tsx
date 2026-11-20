import { notFound } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { shouldUseLocalData, readOfflineData } from "@/lib/offline";

function MovBadge({ type }: { type: string }) {
  if (type === "in")
    return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Entrada</span>;
  if (type === "out")
    return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Saída</span>;
  return <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Ajuste</span>;
}

export default async function ProdutoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let product: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let movements: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let images: any[] = [];

  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const products = (d["products"] ?? []) as Array<Record<string, unknown>>;
    const categories = (d["categories"] ?? []) as Array<Record<string, unknown>>;
    product = products.find((p) => p.id === id) ?? null;
    if (product) {
      const cat = categories.find((c) => c.id === product!.category_id);
      product = { ...product, categories: cat ? { name: cat.name } : null };
    }
    movements = ((d["erp_stock_movements"] ?? []) as Array<Record<string, unknown>>)
      .filter((m) => m.product_id === id)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
      .slice(0, 100);
    images = ((d["product_images"] ?? []) as Array<Record<string, unknown>>)
      .filter((img) => img.product_id === id)
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  } else {
    const supabase = createAdminClient();
    const [{ data: p }, { data: m }, { data: i }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, sku, barcode, price, price_max, stock, is_active, product_type, description, brand, internal_code, category_id, categories(name)")
        .eq("id", id)
        .single(),
      supabase
        .from("erp_stock_movements")
        .select("id, type, quantity, reason, reference, created_at")
        .eq("product_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("product_images")
        .select("url, is_primary, alt")
        .eq("product_id", id)
        .order("position"),
    ]);
    product = p;
    movements = m ?? [];
    images = i ?? [];
  }

  if (!product) notFound();

  const primaryImage = images?.find((i) => i.is_primary)?.url ?? images?.[0]?.url ?? null;
  const movList = movements ?? [];

  const totalIn = movList.filter((m) => m.type === "in").reduce((s, m) => s + m.quantity, 0);
  const totalOut = movList.filter((m) => m.type === "out").reduce((s, m) => s + m.quantity, 0);

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Link href="/produtos" className="hover:text-brand-yellow transition-colors">Produtos</Link>
          <span>›</span>
          <span className="text-gray-300">{product.name}</span>
        </div>

        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          {primaryImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage}
              alt={product.name}
              className="w-20 h-20 rounded-xl object-cover border border-brand-gray-mid shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{product.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${product.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}>
                {product.is_active ? "Ativo" : "Inativo"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                {product.product_type === "service" ? "Serviço" : "Produto"}
              </span>
            </div>
            {product.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{product.description}</p>
            )}
          </div>
          <Link
            href={`/produtos/${id}/editar`}
            className="shrink-0 px-4 py-2 bg-brand-gray-dark border border-brand-gray-mid text-sm text-gray-300 rounded-lg hover:border-brand-yellow hover:text-white transition-colors"
          >
            Editar
          </Link>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Preço", value: formatCurrency(product.price), color: "text-brand-yellow" },
            { label: "Estoque atual", value: String(product.stock ?? 0), color: product.stock < 5 ? "text-red-400" : "text-green-400" },
            { label: "Total entradas", value: String(totalIn), color: "text-green-400" },
            { label: "Total saídas", value: String(totalOut), color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Product details */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 mb-6">
          <div className="text-sm font-semibold text-gray-300 mb-3">Dados do produto</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {[
              { label: "SKU", value: product.sku },
              { label: "Código de barras", value: product.barcode },
              { label: "Código interno", value: product.internal_code },
              { label: "Marca", value: product.brand },
              { label: "Categoria", value: (product.categories as any)?.name },
              { label: "Preço máx.", value: product.price_max ? formatCurrency(product.price_max) : null },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <span className="text-gray-500">{label}: </span>
                  <span className="text-gray-200">{value}</span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Stock movements */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
          <div className="px-5 py-3 border-b border-brand-gray-mid flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">
              Histórico de movimentações ({movList.length})
            </span>
          </div>

          {movList.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-600 text-center">
              Nenhuma movimentação registrada para este produto.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-brand-gray-mid">
                    <th className="text-left px-5 py-2.5">Tipo</th>
                    <th className="text-left px-5 py-2.5">Motivo</th>
                    <th className="text-left px-5 py-2.5 hidden md:table-cell">Referência</th>
                    <th className="text-right px-5 py-2.5">Qtd</th>
                    <th className="text-right px-5 py-2.5 hidden sm:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {movList.map((m) => (
                    <tr key={m.id} className="border-t border-brand-gray-mid hover:bg-white/5">
                      <td className="px-5 py-3">
                        <MovBadge type={m.type} />
                      </td>
                      <td className="px-5 py-3 text-gray-300">{m.reason ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">
                        {m.reference ? (
                          <span className="truncate max-w-[120px] inline-block">{m.reference}</span>
                        ) : "—"}
                      </td>
                      <td className={`px-5 py-3 text-right font-bold ${m.type === "in" ? "text-green-400" : m.type === "out" ? "text-red-400" : "text-gray-400"}`}>
                        {m.type === "in" ? "+" : m.type === "out" ? "-" : "±"}{m.quantity}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500 text-xs hidden sm:table-cell whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
