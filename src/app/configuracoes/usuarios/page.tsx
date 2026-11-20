import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { extractRole } from "@/lib/auth";
import { setUserRoleAction } from "./actions";

function RoleBadge({ role }: { role: string | null }) {
  if (role === "admin")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-yellow/20 text-brand-yellow font-medium">Admin</span>;
  if (role === "operador")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-500/20 text-gray-400">Operador</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Sem acesso</span>;
}

export default async function UsuariosPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });

  const users = (data?.users ?? [])
    .map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: (u.user_metadata?.name as string) ?? (u.user_metadata?.full_name as string) ?? "",
      role: extractRole(u.app_metadata as Record<string, unknown>),
      hasErpRole: !!u.app_metadata?.erp_role,
      lastSignIn: u.last_sign_in_at ?? null,
    }))
    .filter((u) => u.hasErpRole || !u.email.includes("@"))
    .sort((a, b) => {
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return a.email.localeCompare(b.email);
    });

  // All users (for adding access to those without it)
  const allUsers = (data?.users ?? [])
    .filter((u) => !u.app_metadata?.erp_role)
    .map((u) => ({ id: u.id, email: u.email ?? "" }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const inputCls =
    "bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <Link href="/configuracoes" className="hover:text-brand-yellow transition-colors">Configurações</Link>
          <span>›</span>
          <span className="text-gray-300">Usuários</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6">Usuários com acesso ao ERP</h1>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            Erro ao carregar usuários: {error.message}
          </div>
        )}

        {/* Current ERP users */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl mb-6">
          <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
            Usuários com acesso ({users.length})
          </div>

          {users.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-600 text-center">Nenhum usuário com acesso ERP encontrado.</p>
          ) : (
            <div className="divide-y divide-brand-gray-mid">
              {users.map((u) => (
                <div key={u.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {u.name && <div className="text-sm font-medium text-white truncate">{u.name}</div>}
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    {u.lastSignIn && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        Último acesso: {new Date(u.lastSignIn).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>

                  <RoleBadge role={u.role} />

                  <form action={setUserRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={u.id} />
                    <select name="role" defaultValue={u.role ?? "operador"} className={inputCls}>
                      <option value="admin">Admin</option>
                      <option value="operador">Operador</option>
                      <option value="remove">Remover acesso</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-brand-gray-mid border border-brand-gray-light text-xs text-gray-300 rounded-lg hover:border-brand-yellow hover:text-white transition-colors"
                    >
                      Salvar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grant access to other users */}
        {allUsers.length > 0 && (
          <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
            <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
              Conceder acesso a outro usuário
            </div>
            <div className="p-5">
              <form action={setUserRoleAction} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Usuário (Supabase Auth)</label>
                  <select name="user_id" className={`${inputCls} max-w-[280px]`}>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Papel</label>
                  <select name="role" defaultValue="operador" className={inputCls}>
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-yellow text-brand-black text-sm font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
                >
                  Conceder acesso
                </button>
              </form>
              <p className="text-xs text-gray-600 mt-3">
                Apenas usuários já criados no Supabase Auth aparecem aqui. Para criar um novo usuário, acesse o painel do Supabase.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
