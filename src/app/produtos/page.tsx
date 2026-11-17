import AppLayout from "@/components/layout/AppLayout";
import { requireAuth } from "@/lib/auth";
import { getCachedProductsWithDetails } from "@/lib/queries";
import { ProdutosClient, type ProductData, type CategoryOption } from "./ProdutosClient";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ editId?: string }>;
}) {
  await requireAuth();
  const { editId } = await searchParams;

  const { products: rawProducts, categories: rawCategories } = await getCachedProductsWithDetails();

  const products: ProductData[] = rawProducts.map((p: any) => {
    const primaryImg =
      p.product_images?.find((i: any) => i.is_primary)?.url ??
      p.product_images?.[0]?.url ??
      null;
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      brand: p.brand ?? null,
      sku: p.sku ?? null,
      barcode: p.barcode ?? null,
      internal_code: p.internal_code ?? null,
      price: p.price ?? 0,
      price_max: p.price_max ?? null,
      stock: p.stock ?? 0,
      category_id: p.category_id ?? null,
      subcategory_id: p.subcategory_id ?? null,
      is_active: p.is_active ?? true,
      product_type: (p.product_type ?? "product") as "product" | "service",
      primary_image_url: primaryImg,
      category_name: p.categories?.name ?? null,
      subcategory_name: p.subcategories?.name ?? null,
    };
  });

  const categories: CategoryOption[] = rawCategories.map((c: any) => ({
    id: c.id,
    name: c.name,
    subcategories: (c.subcategories ?? []).map((s: any) => ({ id: s.id, name: s.name })),
  }));

  return (
    <AppLayout>
      <ProdutosClient products={products} categories={categories} initialEditId={editId} />
    </AppLayout>
  );
}
