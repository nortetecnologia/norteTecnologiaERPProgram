import { redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import {
  getCachedPDVProducts,
  getCachedCustomers,
  getCachedPaymentMethods,
  getCachedActiveEmployees,
} from "@/lib/queries";
import PDVTabsView from "./PDVTabsView";

const DEFAULT_PAYMENT_METHODS = [
  { name: "dinheiro", label: "Dinheiro" },
  { name: "pix", label: "PIX" },
  { name: "debito", label: "Cartão de Débito" },
  { name: "credito_1x", label: "Crédito 1x" },
];

export default async function PDVPage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const [products, customers, paymentMethodsRaw, employees] = await Promise.all([
    getCachedPDVProducts(),
    getCachedCustomers(),
    getCachedPaymentMethods(),
    getCachedActiveEmployees(),
  ]);
  const paymentMethods = paymentMethodsRaw.length ? paymentMethodsRaw : DEFAULT_PAYMENT_METHODS;

  return (
    <AppLayout>
      <PDVTabsView products={products} customers={customers} paymentMethods={paymentMethods} employees={employees} />
    </AppLayout>
  );
}
