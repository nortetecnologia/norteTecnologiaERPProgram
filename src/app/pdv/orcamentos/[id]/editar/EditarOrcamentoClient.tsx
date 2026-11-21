"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { updateQuoteAction } from "./actions";
import { formatCurrency } from "@/lib/utils";

interface Product { id: string; name: string; price: number; sku?: string; barcode?: string; stock?: number; product_images?: { url: string; is_primary: boolean }[] | null }
interface Customer { id: string; name: string }
interface CartItem { product_id: string; description: string; quantity: number; unit_price: number }
interface PaymentMethodOption { name: string; label: string }
interface Employee { id: string; name: string }

interface Props {
  quoteId: string;
  quoteNumber: string;
  initialItems: CartItem[];
  initialCustomerId: string;
  initialCustomerName: string;
  initialDiscount: number;
  products: Product[];
  customers: Customer[];
  paymentMethods: PaymentMethodOption[];
  employees: Employee[];
}

export function EditarOrcamentoClient({
  quoteId, quoteNumber, initialItems, initialCustomerId, initialCustomerName, initialDiscount,
  products, customers,
}: Props) {
  const [state, formAction] = useActionState(updateQuoteAction, null);
  const [cart, setCart] = useState<CartItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [discountInput, setDiscountInput] = useState(initialDiscount);
  const [discountType, setDiscountType] = useState<"R$" | "%">("R$");
  const [priceTexts, setPriceTexts] = useState<Record<string, string>>({});

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.product_id === product.id);
      if (existing >= 0) return prev.map((item, i) => i === existing ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { product_id: product.id, description: product.name, quantity: 1, unit_price: product.price ?? 0 }];
    });
  }

  function updateCartQty(idx: number, qty: number) {
    if (qty <= 0) setCart((prev) => prev.filter((_, i) => i !== idx));
    else setCart((prev) => prev.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
  }

  function updateCartPrice(idx: number, price: number) {
    setCart((prev) => prev.map((item, i) => i === idx ? { ...item, unit_price: price } : item));
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * (i.unit_price || 0), 0);
  const discount = discountType === "%" ? (subtotal * discountInput) / 100 : discountInput;
  const total = Math.max(0, subtotal - discount);

  const inputCls = "bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow";

  return (
    <form action={formAction} className="flex gap-4 h-[calc(100vh-120px)]">
      <input type="hidden" name="quote_id" value={quoteId} />
      <input type="hidden" name="discount" value={discount.toFixed(2)} />
      <input type="hidden" name="customer_name" value={customerName} />
      <input type="hidden" name="items_count" value={cart.length} />
      {cart.map((item, idx) => (
        <span key={item.product_id} hidden>
          <input name={`item_product_id_${idx}`} value={item.product_id} readOnly />
          <input name={`item_description_${idx}`} value={item.description} readOnly />
          <input name={`item_quantity_${idx}`} value={item.quantity} readOnly />
          <input name={`item_unit_price_${idx}`} value={item.unit_price} readOnly />
        </span>
      ))}

      {/* Left: product search */}
      <div className="flex-1 flex flex-col overflow-hidden border border-brand-gray-mid rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-bold text-white flex-1">Editar: {quoteNumber}</h2>
        </div>
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow mb-3"
        />
        <div className="overflow-y-auto flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
          {filteredProducts.map((p) => (
            <button key={p.id} type="button" onClick={() => addToCart(p)}
              className="text-left bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden hover:border-brand-yellow/50 transition-colors">
              {(p.product_images?.find(i => i.is_primary)?.url ?? p.product_images?.[0]?.url) ? (
                <img src={p.product_images?.find(i => i.is_primary)?.url ?? p.product_images![0].url} alt={p.name} className="w-full h-20 object-cover" />
              ) : (
                <div className="w-full h-20 bg-brand-gray-mid flex items-center justify-center text-2xl text-gray-600">📦</div>
              )}
              <div className="p-2">
                <div className="text-xs text-white font-medium leading-tight truncate">{p.name}</div>
                <div className="text-brand-yellow text-xs font-bold mt-0.5">{formatCurrency(p.price ?? 0)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: cart + controls */}
      <div className="w-[380px] flex flex-col overflow-hidden border border-brand-gray-mid rounded-xl bg-brand-gray-dark">
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Client */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Cliente cadastrado (opcional)</label>
            <select name="customer_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls + " w-full"}>
              <option value="">Consumidor final</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Ou digite o nome</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nome do cliente..." className={inputCls + " w-full"} />
          </div>

          {/* Cart */}
          <div>
            <div className="text-xs text-gray-500 mb-2">Itens ({cart.length})</div>
            {cart.length === 0 ? (
              <div className="text-center py-6 text-gray-600 text-sm border border-dashed border-brand-gray-mid rounded-xl">
                Clique nos produtos para adicionar
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, idx) => (
                  <div key={`${item.product_id}-${idx}`} className="bg-brand-gray-mid rounded-xl p-3">
                    <div className="text-sm text-white font-medium truncate mb-2">{item.description}</div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateCartQty(idx, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-brand-gray-dark text-white text-sm hover:bg-brand-gray-light">−</button>
                      <input type="number" value={item.quantity} onChange={(e) => updateCartQty(idx, parseInt(e.target.value) || 1)}
                        min="1" className="w-12 bg-brand-gray-dark border border-brand-gray-light rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none" />
                      <button type="button" onClick={() => updateCartQty(idx, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-brand-gray-dark text-white text-sm hover:bg-brand-gray-light">+</button>
                      <input type="number"
                        value={priceTexts[`${item.product_id}-${idx}`] ?? item.unit_price}
                        onChange={(e) => {
                          setPriceTexts((prev) => ({ ...prev, [`${item.product_id}-${idx}`]: e.target.value }));
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 0) updateCartPrice(idx, v);
                        }}
                        onBlur={(e) => {
                          const v = parseFloat(e.target.value);
                          updateCartPrice(idx, isNaN(v) || v < 0 ? 0 : v);
                          setPriceTexts((prev) => { const n = { ...prev }; delete n[`${item.product_id}-${idx}`]; return n; });
                        }}
                        min="0" step="0.01"
                        className="flex-1 bg-brand-gray-dark border border-brand-gray-light rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none" />
                      <button type="button" onClick={() => updateCartQty(idx, 0)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                    </div>
                    <div className="text-right text-xs text-gray-400 mt-1">= {formatCurrency(item.quantity * (item.unit_price || 0))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount */}
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Desconto</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg overflow-hidden border border-brand-gray-light shrink-0">
                <button type="button" onClick={() => { setDiscountType("R$"); setDiscountInput(0); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "R$" ? "bg-brand-yellow text-brand-black" : "bg-brand-gray-mid text-gray-400 hover:text-white"}`}>R$</button>
                <button type="button" onClick={() => { setDiscountType("%"); setDiscountInput(0); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "%" ? "bg-brand-yellow text-brand-black" : "bg-brand-gray-mid text-gray-400 hover:text-white"}`}>%</button>
              </div>
              <input type="number" value={discountInput || ""} onChange={(e) => setDiscountInput(parseFloat(e.target.value) || 0)}
                min="0" max={discountType === "%" ? 100 : undefined} step={discountType === "%" ? 1 : 0.01}
                placeholder="0,00" className="flex-1 bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-gray-mid space-y-2">
          {state && "error" in state && state.error && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{state.error}</div>
          )}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Desconto</span><span>- {formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white border-t border-brand-gray-mid pt-2">
            <span>Total</span><span className="text-brand-yellow">{formatCurrency(total)}</span>
          </div>
          <button type="submit"
            className="w-full bg-brand-yellow hover:bg-yellow-400 text-brand-black font-black py-3 rounded-xl transition-colors text-sm">
            Salvar Orçamento
          </button>
        </div>
      </div>
    </form>
  );
}
