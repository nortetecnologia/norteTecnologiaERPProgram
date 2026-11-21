"use client";

import { useActionState } from "react";
import { createUserAction } from "./actions";

const inputCls =
  "bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserAction, null);

  return (
    <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {state?.error && (
        <div className="col-span-full p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="col-span-full p-3 rounded-lg bg-green-900/30 border border-green-700 text-green-300 text-sm">
          Usuário criado com sucesso.
        </div>
      )}
      <div>
        <label className="text-xs text-gray-500 block mb-1">E-mail</label>
        <input
          type="email"
          name="email"
          required
          placeholder="usuario@empresa.com"
          className={inputCls + " w-full"}
          autoComplete="off"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Senha</label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className={inputCls + " w-full"}
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Papel</label>
        <select name="role" defaultValue="operador" className={inputCls + " w-full"}>
          <option value="admin">Admin</option>
          <option value="operador">Operador</option>
        </select>
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full px-4 py-2 bg-brand-yellow text-brand-black text-sm font-semibold rounded-lg hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          {pending ? "Criando..." : "Criar usuário"}
        </button>
      </div>
    </form>
  );
}
