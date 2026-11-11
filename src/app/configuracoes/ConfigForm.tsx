"use client";

import { useState } from "react";
import { useActionState } from "react";
import { saveSettings } from "./actions";

interface PaymentMethod {
  name: string;
  label: string;
}

export default function ConfigForm({
  settings,
  paymentMethods,
}: {
  settings: any;
  paymentMethods: { id: number; name: string; label: string; is_active: boolean; position: number }[];
}) {
  const [state, action, isPending] = useActionState(saveSettings, null);

  const [methods, setMethods] = useState<PaymentMethod[]>(
    paymentMethods.filter((m) => m.is_active).map((m) => ({ name: m.name, label: m.label }))
  );
  const [newLabel, setNewLabel] = useState("");

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function addMethod() {
    const label = newLabel.trim();
    if (!label) return;
    const name = slugify(label) || `metodo_${Date.now()}`;
    if (methods.some((m) => m.name === name || m.label === label)) return;
    setMethods((prev) => [...prev, { name, label }]);
    setNewLabel("");
  }

  function removeMethod(name: string) {
    setMethods((prev) => prev.filter((m) => m.name !== name));
  }

  return (
    <form action={action} className="space-y-6">
      {state?.success && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 text-sm rounded-xl px-4 py-3">
          Configurações salvas com sucesso.
        </div>
      )}
      {state?.error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Hidden inputs para a lista de formas de pagamento */}
      {methods.map((m) => (
        <span key={m.name}>
          <input type="hidden" name="pm_name" value={m.name} />
          <input type="hidden" name="pm_label" value={m.label} />
        </span>
      ))}

      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-4">
        <div className="text-sm font-semibold text-gray-300">Dados da empresa</div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Nome da empresa</label>
          <input
            type="text"
            name="store_name"
            defaultValue={settings?.store_name ?? "Norte Tecnologia"}
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">WhatsApp / Telefone</label>
            <input
              type="text"
              name="whatsapp_number"
              defaultValue={settings?.whatsapp_number ?? ""}
              placeholder="5591999999999"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              defaultValue={settings?.email ?? ""}
              placeholder="contato@empresa.com"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Endereço</label>
          <input
            type="text"
            name="address"
            defaultValue={settings?.address ?? ""}
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Cidade</label>
            <input
              type="text"
              name="city"
              defaultValue={settings?.city ?? ""}
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Estado (UF)</label>
            <input
              type="text"
              name="state_abbr"
              defaultValue={settings?.state_abbr ?? ""}
              maxLength={2}
              placeholder="PA"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>
      </div>

      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold text-gray-300">Formas de pagamento</div>
          <p className="text-xs text-gray-500 mt-1">Métodos disponíveis no PDV e no site.</p>
        </div>

        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.name} className="flex items-center justify-between bg-brand-gray-mid rounded-lg px-3 py-2">
              <div>
                <span className="text-sm text-white">{m.label}</span>
                <span className="text-xs text-gray-600 ml-2">({m.name})</span>
              </div>
              <button
                type="button"
                onClick={() => removeMethod(m.name)}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors ml-3"
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMethod(); } }}
            placeholder="Ex: Cheque, Crédito 10x..."
            className="flex-1 bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
          />
          <button
            type="button"
            onClick={addMethod}
            className="px-4 py-2 bg-brand-gray-mid border border-brand-gray-light text-sm text-gray-300 hover:text-brand-yellow rounded-lg transition-colors"
          >
            + Adicionar
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-bold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}
