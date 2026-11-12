import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { ProdutosClient, type ProductData, type CategoryOption } from "./ProdutosClient";

export default async function ProdutosPage() {
  await requireAuth();
  const supabase = createAdminClient();

  const [{ data: rawProducts }, { data: rawCategories }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, description, brand, sku, barcode, internal_code, price, price_max, stock, category_id, subcategory_id, is_active, product_type, product_images(url, is_primary), categories(name), subcategories(name)"
      )
      .order("name")
      .limit(500),
    supabase
      .from("categories")
      .select("id, name, subcategories(id, name)")
      .order("name"),
  ]);

  const products: ProductData[] = (rawProducts ?? []).map((p: any) => {
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

  const categories: CategoryOption[] = (rawCategories ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    subcategories: (c.subcategories ?? []).map((s: any) => ({ id: s.id, name: s.name })),
  }));

  return (
    <AppLayout>
      <ProdutosClient products={products} categories={categories} />
    </AppLayout>
  );
}
