import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { extractRole } from "@/lib/auth";
import { setUserRoleAction } from "./actions";
import { DeleteUserButton } from "./DeleteUserButton";
import { CreateUserForm } from "./CreateUserForm";

function RoleBadge({ role }: { role: string | null }) {
  if (role === "admin")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-brand-yellow/20 text-brand-yellow font-medium">Admin</span>;
  if (role === "operador")
    return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Operador</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Sem acesso</span>;
}

export default async function UsuariosPage() {
  const { userId: callerId } = await requireAdmin();

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
      isSelf: u.id === callerId,
    }))
    .filter((u) => u.hasErpRole)
    .sort((a, b) => {
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (a.role === "admin" && b.role !== "admin") return -1;
      if (b.role === "admin" && a.role !== "admin") return 1;
      return a.email.localeCompare(b.email);
    });

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

        {/* Hierarquia de papéis */}
        <div className="mb-6 p-4 bg-brand-gray-dark border border-brand-gray-mid rounded-xl text-xs text-gray-500 space-y-1">
          <p><span className="text-brand-yellow font-semibold">Admin</span> — acesso total: configurações, relatórios, produtos, clientes, PDV, OS. Pode criar, alterar papel e excluir qualquer usuário (exceto a si mesmo).</p>
          <p><span className="text-blue-400 font-semibold">Operador</span> — acesso restrito: PDV (vendas), adicionar clientes, criar OS. Sem acesso a configurações.</p>
        </div>

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
                    <div className="text-xs text-gray-400 truncate">
                      {u.email}
                      {u.isSelf && <span className="ml-2 text-gray-600">(você)</span>}
                    </div>
                    {u.lastSignIn && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        Último acesso: {new Date(u.lastSignIn).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>

                  <RoleBadge role={u.role} />

                  {u.isSelf ? (
                    <span className="text-xs text-gray-600 italic">conta atual</span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Change role */}
                      <form action={setUserRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={u.id} />
                        <select name="role" defaultValue={u.role ?? "operador"} className={inputCls}>
                          <option value="admin">Admin</option>
                          <option value="operador">Operador</option>
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-brand-gray-mid border border-brand-gray-light text-xs text-gray-300 rounded-lg hover:border-brand-yellow hover:text-white transition-colors"
                        >
                          Salvar
                        </button>
                      </form>

                      {/* Delete */}
                      <DeleteUserButton userId={u.id} email={u.email} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create new user */}
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl">
          <div className="px-5 py-3 border-b border-brand-gray-mid text-sm font-semibold text-gray-300">
            Criar novo usuário
          </div>
          <div className="p-5">
            <CreateUserForm />
            <p className="text-xs text-gray-600 mt-3">
              O usuário é criado diretamente no Supabase Auth e já pode fazer login imediatamente.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
