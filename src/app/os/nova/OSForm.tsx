"use client";

import { useState, useActionState, useRef } from "react";
import Image from "next/image";
import { createServiceOrder } from "../actions";
import { uploadOSImage } from "../uploadAction";

interface Customer { id: string; name: string; phone?: string }
interface Product { id: string; name: string; price: number; sku?: string }
interface Item { description: string; quantity: number; unit_price: number; product_id?: string }

const INITIAL: { error?: string } = {};

export default function OSForm({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [state, action, isPending] = useActionState(createServiceOrder, INITIAL);
  const [items, setItems] = useState<Item[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadOSImage(fd);
    setUploading(false);
    if (result.url) {
      setImageUrls((prev) => [...prev, result.url!]);
    } else {
      setUploadError(result.error ?? "Erro no upload.");
    }
  }

  function removeImage(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  }

  function fillFromProduct(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, product_id: product.id, description: product.name, unit_price: product.price }
          : item
      )
    );
  }

  const itemsTotal = items.reduce((s, i) => s + i.quantity * (i.unit_price || 0), 0);

  return (
    <form action={action} className="space-y-6">
      {state?.error && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {state.error}
        </div>
      )}

      {/* Customer + Problem */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Cliente *</label>
          <select
            name="customer_id"
            required
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
          >
            <option value="">Selecione o cliente...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `· ${c.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Problema relatado *</label>
          <input
            type="text"
            name="title"
            required
            placeholder="Ex: Notebook não liga, tela quebrada..."
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Descrição detalhada</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Descreva o problema com mais detalhes..."
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow resize-none"
          />
        </div>
      </div>

      {/* Equipment */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-4">
        <div className="text-sm font-semibold text-gray-300">Equipamento</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Equipamento</label>
            <input
              type="text"
              name="equipment"
              placeholder="Ex: Notebook Dell Inspiron 15"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Número de série</label>
            <input
              type="text"
              name="serial_number"
              placeholder="SN / IMEI"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Previsão de entrega</label>
            <input
              type="date"
              name="estimated_at"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-3">
        <div className="text-sm font-semibold text-gray-300">Imagens do Equipamento</div>

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-brand-gray-mid">
                <Image src={url} alt={`Imagem ${idx + 1}`} fill className="object-cover" sizes="150px" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remover imagem"
                >
                  ✕
                </button>
                <input type="hidden" name={`image_url_${idx}`} value={url} />
              </div>
            ))}
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-red-400">{uploadError}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-sm text-brand-yellow hover:text-brand-yellow-dark transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 010 20" />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Adicionar imagem
              </>
            )}
          </button>
          <span className="text-xs text-gray-600">JPG, PNG, WebP — máx. 10MB</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <input type="hidden" name="images_count" value={imageUrls.length} />
      </div>

      {/* Items */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-3">
        <div className="text-sm font-semibold text-gray-300">Peças e Serviços</div>
        {items.map((item, idx) => (
          <div key={idx} className="flex flex-col gap-2 pt-3 border-t border-brand-gray-mid first:border-0 first:pt-0">
            <div className="flex gap-2">
              <select
                onChange={(e) => fillFromProduct(idx, e.target.value)}
                className="flex-1 bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-xs text-gray-400 focus:outline-none focus:border-brand-yellow"
              >
                <option value="">Preencher do catálogo...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-red-400 hover:text-red-300 text-xs px-2"
                >
                  ✕
                </button>
              )}
            </div>
            <input type="hidden" name={`item_product_id_${idx}`} value={item.product_id ?? ""} />
            <input
              type="text"
              name={`item_description_${idx}`}
              value={item.description}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
              placeholder="Descrição do item ou serviço"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Qtd</label>
                <input
                  type="number"
                  name={`item_quantity_${idx}`}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))}
                  min="1"
                  className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Valor unitário (R$)</label>
                <input
                  type="number"
                  name={`item_unit_price_${idx}`}
                  value={item.unit_price}
                  onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))}
                  min="0"
                  step="0.01"
                  className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
                  required
                />
              </div>
            </div>
          </div>
        ))}
        <input type="hidden" name="items_count" value={items.length} />

        <button
          type="button"
          onClick={addItem}
          className="text-sm text-brand-yellow hover:text-brand-yellow-dark transition-colors"
        >
          + Adicionar item
        </button>
      </div>

      {/* Labor + totals */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Mão de obra (R$)</label>
            <input
              type="number"
              name="labor_cost"
              defaultValue="0"
              min="0"
              step="0.01"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Desconto (R$)</label>
            <input
              type="number"
              name="discount"
              defaultValue="0"
              min="0"
              step="0.01"
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 block mb-1">Observações internas</label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Notas internas (não aparecem na OS impressa)"
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow resize-none"
          />
        </div>

        <div className="text-right text-sm text-gray-400">
          Total estimado de itens: <span className="text-white font-semibold">
            R$ {itemsTotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Criar Ordem de Serviço"}
        </button>
        <a
          href="/os"
          className="px-6 py-3 border border-brand-gray-mid text-gray-400 rounded-xl hover:border-gray-400 transition-colors text-sm text-center"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
