import { redirect, notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CustomerForm from "../../CustomerForm";
import type { Customer } from "@/types";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: customer } = await supabase
    .from("erp_customers")
    .select("*")
    .eq("id", id)
    .single<Customer>();

  if (!customer) notFound();

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <a href={`/clientes/${id}`} className="text-gray-500 hover:text-gray-300 text-sm">
            ← {customer.name}
          </a>
          <span className="text-gray-600">/</span>
          <h1 className="text-xl font-bold text-white">Editar</h1>
        </div>
        <CustomerForm customer={customer} />
      </div>
    </AppLayout>
  );
}
