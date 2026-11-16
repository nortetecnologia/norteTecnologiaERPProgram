import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PDVClient from "./PDVClient";

export default async function PDVPage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const [{ data: productsRaw }, { data: customersRaw }, { data: paymentMethodsRaw }, { data: employeesRaw }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, price, sku, stock, product_images(url, is_primary)")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("erp_customers")
      .select("id, name, phone")
      .order("name"),
    supabase
      .from("payment_methods")
      .select("name, label")
      .eq("is_active", true)
      .order("position"),
    supabase
      .from("erp_employees")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
  ]);
  const products = productsRaw ?? [];
  const customers = customersRaw ?? [];
  const employees = employeesRaw ?? [];
  const paymentMethods = paymentMethodsRaw ?? [
    { name: "dinheiro", label: "Dinheiro" },
    { name: "pix", label: "PIX" },
    { name: "debito", label: "Cartão de Débito" },
    { name: "credito_1x", label: "Crédito 1x" },
  ];

  return (
    <AppLayout>
      <PDVClient products={products} customers={customers} paymentMethods={paymentMethods} employees={employees} />
    </AppLayout>
  );
}
