import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import CustomerForm from "../CustomerForm";

export default async function NovoClientePage() {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Novo Cliente</h1>
          <Link href="/clientes" className="text-sm px-4 py-2 border border-brand-gray-mid text-gray-500 rounded-lg hover:border-gray-400 transition-colors">
            ← Voltar
          </Link>
        </div>
        <CustomerForm />
      </div>
    </AppLayout>
  );
}
