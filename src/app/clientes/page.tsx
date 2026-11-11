import { redirect } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatPhone } from "@/lib/utils";
import type { Customer } from "@/types";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) redirect("/login");

  const { q } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("erp_customers")
    .select("*")
    .order("name");

  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,cpf_cnpj.ilike.%${q}%`);
  }

  const { data: customersRaw } = await query.returns<Customer[]>();
  const customers = customersRaw ?? [];

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <Link
            href="/clientes/novo"
            className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            + Novo Cliente
          </Link>
        </div>

        {/* Search */}
        <form className="mb-5">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome, telefone ou CPF/CNPJ..."
            className="w-full max-w-md bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
          />
        </form>

        {customers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            {q ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
          </div>
        ) : (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-gray-mid text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Nome</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">Telefone</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">CPF/CNPJ</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">Cadastrado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-brand-gray-mid last:border-0 hover:bg-white/5">
                    <td className="px-5 py-3">
                      <Link href={`/clientes/${c.id}`} className="text-white hover:text-brand-yellow font-medium">
                        {c.name}
                      </Link>
                      {c.email && <div className="text-xs text-gray-500">{c.email}</div>}
                    </td>
                    <td className="px-5 py-3 text-gray-300 hidden md:table-cell">
                      {c.phone ? formatPhone(c.phone) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-300 hidden lg:table-cell">
                      {c.cpf_cnpj || "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden lg:table-cell text-xs">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/clientes/${c.id}/editar`}
                        className="text-xs text-gray-400 hover:text-brand-yellow"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
