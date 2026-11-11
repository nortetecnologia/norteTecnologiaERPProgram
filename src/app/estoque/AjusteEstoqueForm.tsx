"use client";

import { useActionState, useState } from "react";
import { adjustStock } from "./actions";

interface Product { id: string; name: string; sku?: string; stock: number }

export default function AjusteEstoqueForm({ products }: { products: Product[] }) {
  const [state, action, isPending] = useActionState(adjustStock, null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"in" | "out" | "adjustment">("in");

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black text-sm font-bold px-4 py-2 rounded-lg transition-colors"
      >
        + Ajustar Estoque
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Ajustar Estoque</h2>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">✕</button>
        </div>

        {state?.success ? (
          <div className="text-center py-6">
            <div className="text-green-400 text-4xl mb-3">✓</div>
            <div className="text-white font-semibold">{state.productName}</div>
            <div className="text-gray-400 text-sm mt-1">Novo estoque: {state.newStock} unidades</div>
            <button
              onClick={() => { setOpen(false); setSearch(""); }}
              className="mt-4 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-bold px-6 py-2 rounded-lg text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            {state?.error && (
              <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{state.error}</div>
            )}

            <div>
              <label className="text-xs text-gray-400 block mb-1">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "in", label: "Entrada" },
                  { value: "out", label: "Saída" },
                  { value: "adjustment", label: "Ajuste" },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value as typeof type)}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      type === t.value
                        ? "bg-brand-yellow text-brand-black"
                        : "bg-brand-gray-mid text-gray-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={type} />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Produto *</label>
              <input
                type="text"
                placeholder="Buscar por nome ou SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow mb-2"
              />
              <select
                name="product_id"
                required
                className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
                size={Math.min(5, Math.max(1, filtered.length))}
              >
                {filtered.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""} — estoque atual: {p.stock}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {type === "adjustment" ? "Novo estoque (valor absoluto) *" : "Quantidade *"}
              </label>
              <input
                type="number"
                name="quantity"
                min="1"
                required
                className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Motivo</label>
              <input
                type="text"
                name="reason"
                placeholder="Ex: Compra de fornecedor, Devolução..."
                className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {isPending ? "Salvando..." : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 border border-brand-gray-mid text-gray-400 rounded-xl hover:border-gray-400 transition-colors text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
