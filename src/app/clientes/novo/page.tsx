import { redirect } from "next/navigation";
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
        <h1 className="text-2xl font-bold text-white mb-6">Novo Cliente</h1>
        <CustomerForm />
      </div>
    </AppLayout>
  );
}
