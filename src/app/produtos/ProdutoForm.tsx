"use client";

import { useActionState } from "react";
import { saveProduto } from "./actions";
import ImageUpload from "@/components/ImageUpload";

interface Category { id: string; name: string }

export default function ProdutoForm({
  categories,
  product,
}: {
  categories: Category[];
  product?: any;
}) {
  const [state, action, isPending] = useActionState(saveProduto, null);

  return (
    <form action={action} className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}

      {state?.error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {state.error}
        </div>
      )}

      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Nome *</label>
          <input
            type="text"
            name="name"
            defaultValue={product?.name}
            required
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">SKU</label>
            <input
              type="text"
              name="sku"
              defaultValue={product?.sku}
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Preço (R$) *</label>
            <input
              type="number"
              name="price"
              defaultValue={product?.price ?? "0"}
              min="0"
              step="0.01"
              required
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Estoque</label>
            <input
              type="number"
              name="stock"
              defaultValue={product?.stock ?? "0"}
              min="0"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Categoria</label>
            <select
              name="category_id"
              defaultValue={product?.category_id ?? ""}
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Descrição</label>
          <textarea
            name="description"
            defaultValue={product?.description}
            rows={3}
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="is_active"
            id="is_active"
            defaultChecked={product?.is_active ?? true}
            value="true"
            className="accent-brand-yellow"
          />
          <label htmlFor="is_active" className="text-sm text-gray-300">Produto ativo</label>
        </div>

        <ImageUpload
          name="primary_image_url"
          currentUrl={product?.product_images?.find((i: any) => i.is_primary)?.url ?? product?.product_images?.[0]?.url}
          folder="erp/produtos"
          label="Imagem do produto"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? "Salvando..." : product ? "Salvar alterações" : "Criar produto"}
        </button>
        <a
          href="/produtos"
          className="px-6 py-3 border border-brand-gray-mid text-gray-400 rounded-xl hover:border-gray-400 transition-colors text-sm text-center"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
