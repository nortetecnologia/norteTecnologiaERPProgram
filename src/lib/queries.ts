import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";

const TTL = 60;

export const getCachedDashboard = (todayISO: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const [salesRes, osRes, stockRes, recentSalesRes] = await Promise.all([
        supabase.from("erp_pdv_sales").select("total").gte("created_at", todayISO),
        supabase.from("erp_service_orders").select("id", { count: "exact" }).in("status", ["awaiting", "in_progress"]),
        supabase.from("products").select("id", { count: "exact" }).lt("stock", 5).eq("is_active", true).eq("product_type", "product"),
        supabase.from("erp_pdv_sales").select("id, sale_number, total, created_at").order("created_at", { ascending: false }).limit(5),
      ]);
      return { salesRes, osRes, stockRes, recentSalesRes };
    },
    ["dashboard", todayISO],
    { revalidate: TTL, tags: ["dashboard", "sales", "service-orders", "products"] }
  )();

export const getCachedCustomers = () =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase.from("erp_customers").select("*").order("name");
      return data ?? [];
    },
    ["customers-list"],
    { revalidate: TTL, tags: ["customers"] }
  )();

export const getCachedProducts = () =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, price, stock, is_active, product_images(url, is_primary)")
        .order("name")
        .limit(200);
      return data ?? [];
    },
    ["products-list"],
    { revalidate: TTL, tags: ["products"] }
  )();

export const getCachedServiceOrders = (status?: string) =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      let query = supabase
        .from("erp_service_orders")
        .select("*, erp_customers(name, phone)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) query = query.eq("status", status);
      const { data } = await query;
      return data ?? [];
    },
    ["service-orders-list", status ?? "all"],
    { revalidate: 30, tags: ["service-orders", "customers"] }
  )();

export const getCachedStock = () =>
  unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const [allProductsRes, lowStockRes, noImageRes, noSkuRes, recentMovRes] = await Promise.all([
        supabase.from("products").select("id, name, sku, stock").eq("is_active", true).eq("product_type", "product").order("name").limit(500),
        supabase.from("products").select("id, name, sku, stock, price, categories(name)").eq("is_active", true).eq("product_type", "product").lt("stock", 5).order("stock").limit(50),
        supabase.from("products").select("id, name, sku, stock, is_active").eq("product_type", "product").or("images.is.null,images.eq.{}").limit(50),
        supabase.from("products").select("id, name, stock, is_active").eq("product_type", "product").is("sku", null).limit(50),
        supabase.from("erp_stock_movements").select("id, type, quantity, reason, created_at, products(name, sku)").order("created_at", { ascending: false }).limit(10),
      ]);
      return { allProductsRes, lowStockRes, noImageRes, noSkuRes, recentMovRes };
    },
    ["stock-data"],
    { revalidate: TTL, tags: ["products", "stock-movements"] }
  )();
