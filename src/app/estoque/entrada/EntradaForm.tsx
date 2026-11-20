"use client";

import { useActionState, useState } from "react";
import { processEntrada } from "./actions";

type Product = { id: string; name: string; sku: string | null; stock: number };

type ItemRow = { product_id: string; quantity: number; unit_cost: number };

const initialState = { error: undefined as string | undefined };

export default function EntradaForm({ products }: { products: Product[] }) {
  const [state, formAction, isPending] = useActionState(processEntrada, initialState);
  const [items, setItems] = useState<ItemRow[]>([{ product_id: "", quantity: 1, unit_cost: 0 }]);

  function addItem() {
    setItems((prev) => [...prev, { product_id: "", quantity: 1, unit_cost: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof ItemRow, value: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, [field]: field === "product_id" ? value : Number(value) }
          : item
      )
    );
  }

  const inputCls =
    "bg-brand-black border border-brand-gray-mid text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-brand-yellow w-full";

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden items count */}
      <input type="hidden" name="items_count" value={items.length} />

      {/* Hidden item fields */}
      {items.map((item, i) => (
        <span key={i}>
          <input type="hidden" name={`item_product_id_${i}`} value={item.product_id} />
          <input type="hidden" name={`item_quantity_${i}`} value={item.quantity} />
          <input type="hidden" name={`item_unit_cost_${i}`} value={item.unit_cost} />
        </span>
      ))}

      {/* Supplier + reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fornecedor</label>
          <input
            type="text"
            name="fornecedor"
            placeholder="Nome do fornecedor (opcional)"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Referência / NF</label>
          <input
            type="text"
            name="referencia"
            placeholder="Número da nota ou referência (opcional)"
            className={inputCls}
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-300">Produtos</span>
          <button
            type="button"
            onClick={addItem}
            className="text-xs px-3 py-1.5 border border-brand-gray-mid text-gray-400 rounded-lg hover:border-brand-yellow hover:text-brand-yellow transition-colors"
          >
            + Adicionar produto
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => {
            const selected = products.find((p) => p.id === item.product_id);
            return (
              <div
                key={i}
                className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_36px] gap-3 items-end"
              >
                {/* Product select */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Produto</label>
                  <select
                    value={item.product_id}
                    onChange={(e) => updateItem(i, "product_id", e.target.value)}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecione...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.sku ? ` (${p.sku})` : ""} — estoque: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, "quantity", e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>

                {/* Unit cost */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Custo unit. (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_cost}
                    onChange={(e) => updateItem(i, "unit_cost", e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="text-gray-600 hover:text-red-400 transition-colors disabled:opacity-30 h-9 flex items-center justify-center"
                  title="Remover"
                >
                  ✕
                </button>

                {/* New stock preview */}
                {selected && item.quantity > 0 && (
                  <div className="sm:col-span-4 text-xs text-gray-500">
                    Estoque após entrada:{" "}
                    <span className="text-green-400 font-semibold">
                      {selected.stock} → {selected.stock + item.quantity}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {state?.error && (
        <div className="text-red-400 text-sm bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-brand-yellow text-brand-black font-semibold text-sm rounded-lg hover:bg-yellow-400 transition-colors disabled:opacity-50"
        >
          {isPending ? "Registrando..." : "Registrar entrada"}
        </button>
        <a
          href="/estoque"
          className="px-6 py-2.5 border border-brand-gray-mid text-gray-400 text-sm rounded-lg hover:border-gray-400 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
