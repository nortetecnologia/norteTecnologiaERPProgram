import { unstable_cache } from "next/cache";
import { createAdminClient } from "./supabase/admin";
import { shouldUseLocalData, readOfflineData } from "./offline";

const TTL = 60;

export const getCachedDashboard = (todayISO: string) => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const sales = (d["erp_pdv_sales"] ?? []) as any[];
    const os = (d["erp_service_orders"] ?? []) as any[];
    const products = (d["products"] ?? []) as any[];
    const todaySales = sales.filter((s: any) => s.created_at >= todayISO);
    const openOS = os.filter((o: any) => ["awaiting", "in_progress"].includes(o.status));
    const lowStock = products.filter((p: any) => p.is_active && p.product_type === "product" && p.stock < 5);
    const recentSales = [...sales].sort((a, b) => b.created_at?.localeCompare(a.created_at)).slice(0, 5);
    return Promise.resolve({
      salesRes: { data: todaySales, error: null, count: todaySales.length },
      osRes: { data: openOS, error: null, count: openOS.length },
      stockRes: { data: lowStock, error: null, count: lowStock.length },
      recentSalesRes: { data: recentSales, error: null },
    });
  }
  return unstable_cache(
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
};

export const getCachedCustomers = () => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const rows = (d["erp_customers"] ?? []) as any[];
    return Promise.resolve(rows.sort((a, b) => a.name?.localeCompare(b.name)));
  }
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase.from("erp_customers").select("*").order("name");
      return data ?? [];
    },
    ["customers-list"],
    { revalidate: TTL, tags: ["customers"] }
  )();
};

export const getCachedProducts = () => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const imgs = (d["product_images"] ?? []) as any[];
    const rows = (d["products"] ?? []) as any[];
    return Promise.resolve(
      rows.sort((a, b) => a.name?.localeCompare(b.name)).slice(0, 200).map((p: any) => ({
        ...p,
        product_images: imgs.filter((i) => i.product_id === p.id),
      }))
    );
  }
  return unstable_cache(
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
};

export const getCachedServiceOrders = (status?: string) => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const customers = (d["erp_customers"] ?? []) as any[];
    let rows = (d["erp_service_orders"] ?? []) as any[];
    if (status) rows = rows.filter((o: any) => o.status === status);
    return Promise.resolve(
      rows.sort((a, b) => b.created_at?.localeCompare(a.created_at)).slice(0, 100).map((o: any) => ({
        ...o,
        erp_customers: customers.find((c) => c.id === o.customer_id) ?? null,
      }))
    );
  }
  return unstable_cache(
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
};

export const getSaleReceipt = async (id: string) => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const sale = ((d["erp_pdv_sales"] ?? []) as any[]).find((s) => s.id === id);
    if (!sale) return null;
    const customer = ((d["erp_customers"] ?? []) as any[]).find((c) => c.id === sale.customer_id) ?? null;
    return {
      ...sale,
      erp_customers: customer ? { name: customer.name, phone: customer.phone } : null,
      erp_pdv_sale_items: ((d["erp_pdv_sale_items"] ?? []) as any[]).filter((i) => i.sale_id === id),
      erp_pdv_sale_payments: ((d["erp_pdv_sale_payments"] ?? []) as any[]).filter((p) => p.sale_id === id),
    };
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("erp_pdv_sales")
    .select("*, erp_customers(name, phone), erp_pdv_sale_items(*), erp_pdv_sale_payments(*)")
    .eq("id", id)
    .single();
  return data;
};

export const getServiceOrderDetail = async (id: string) => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const os = ((d["erp_service_orders"] ?? []) as any[]).find((o) => o.id === id);
    if (!os) return null;
    const customer = ((d["erp_customers"] ?? []) as any[]).find((c) => c.id === os.customer_id) ?? null;
    const products = (d["products"] ?? []) as any[];
    const items = ((d["erp_service_order_items"] ?? []) as any[])
      .filter((i) => i.service_order_id === id)
      .map((i) => {
        const prod = products.find((p) => p.id === i.product_id);
        return { ...i, products: prod ? { name: prod.name, sku: prod.sku } : null };
      });
    return { ...os, erp_customers: customer, erp_service_order_items: items };
  }
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("erp_service_orders")
    .select("*, erp_customers(*), erp_service_order_items(*, products(name, sku))")
    .eq("id", id)
    .single();
  return data;
};

export const getCachedStock = () => {
  if (shouldUseLocalData()) {
    const d = readOfflineData();
    const products = (d["products"] ?? []) as any[];
    const imgs = (d["product_images"] ?? []) as any[];
    const movements = (d["erp_stock_movements"] ?? []) as any[];
    const activeProducts = products.filter((p: any) => p.is_active && p.product_type === "product");
    const imgProductIds = new Set(imgs.map((i: any) => i.product_id));
    return Promise.resolve({
      allProductsRes: { data: activeProducts.slice(0, 500), error: null },
      lowStockRes: { data: activeProducts.filter((p: any) => p.stock < 5).sort((a: any, b: any) => a.stock - b.stock).slice(0, 50), error: null },
      noImageRes: { data: products.filter((p: any) => p.product_type === "product" && !imgProductIds.has(p.id)).slice(0, 50), error: null },
      noSkuRes: { data: products.filter((p: any) => p.product_type === "product" && !p.sku).slice(0, 50), error: null },
      recentMovRes: { data: movements.sort((a: any, b: any) => b.created_at?.localeCompare(a.created_at)).slice(0, 10), error: null },
    });
  }
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const [allProductsRes, lowStockRes, noImageRaw, noSkuRes, recentMovRes] = await Promise.all([
        supabase.from("products").select("id, name, sku, stock").eq("is_active", true).eq("product_type", "product").order("name").limit(500),
        supabase.from("products").select("id, name, sku, stock, price, categories(name)").eq("is_active", true).eq("product_type", "product").lt("stock", 5).order("stock").limit(50),
        supabase.from("products").select("id, name, sku, stock, is_active, product_images(id)").eq("product_type", "product").limit(200),
        supabase.from("products").select("id, name, stock, is_active").eq("product_type", "product").is("sku", null).limit(50),
        supabase.from("erp_stock_movements").select("id, type, quantity, reason, created_at, products(name, sku)").order("created_at", { ascending: false }).limit(10),
      ]);
      const noImageRes = {
        data: (noImageRaw.data ?? []).filter((p: any) => !p.product_images?.length),
        error: noImageRaw.error,
      };
      return { allProductsRes, lowStockRes, noImageRes, noSkuRes, recentMovRes };
    },
    ["stock-data"],
    { revalidate: TTL, tags: ["products", "stock-movements"] }
  )();
};
