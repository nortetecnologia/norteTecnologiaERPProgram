"use client";

import { useState, useActionState } from "react";
import { createSale } from "./actions";
import { formatCurrency } from "@/lib/utils";

interface Product { id: string; name: string; price: number; sku?: string; stock?: number; product_images?: { url: string; is_primary: boolean }[] | null }
interface Customer { id: string; name: string; phone?: string }
interface CartItem { product_id: string; description: string; quantity: number; unit_price: number }
interface Payment { method: string; amount: number }
interface PaymentMethodOption { name: string; label: string }

export default function PDVClient({
  products,
  customers,
  paymentMethods,
}: {
  products: Product[];
  customers: Customer[];
  paymentMethods: PaymentMethodOption[];
}) {
  const defaultMethod = paymentMethods[0]?.name ?? "pix";
  const [state, action, isPending] = useActionState(createSale, null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([{ method: defaultMethod, amount: 0 }]);
  const [discountInput, setDiscountInput] = useState(0);
  const [discountType, setDiscountType] = useState<"R$" | "%">("R$");
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.product_id === product.id);
      if (existing >= 0) {
        return prev.map((item, i) =>
          i === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product_id: product.id, description: product.name, quantity: 1, unit_price: product.price }];
    });
  }

  function updateCartQty(idx: number, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setCart((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item)));
    }
  }

  function updateCartPrice(idx: number, price: number) {
    setCart((prev) => prev.map((item, i) => (i === idx ? { ...item, unit_price: price } : item)));
  }

  function addPayment() {
    setPayments((prev) => [...prev, { method: defaultMethod, amount: 0 }]);
  }

  function removePayment(idx: number) {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePayment(idx: number, field: keyof Payment, value: string | number) {
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discount = discountType === "%" ? (subtotal * discountInput) / 100 : discountInput;
  const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const total = Math.max(0, subtotal - discount);
  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const change = paidTotal - total;

  function fillPaymentWithTotal() {
    if (payments.length === 1) {
      setPayments([{ ...payments[0], amount: total }]);
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Left: Product search + catalog */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden border-r border-brand-gray-mid">
        <h1 className="text-xl font-bold text-white mb-3">PDV — Ponto de Venda</h1>

        <input
          type="text"
          placeholder="Buscar produto por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow mb-3"
        />

        <div className="overflow-y-auto flex-1 grid grid-cols-2 md:grid-cols-3 gap-2 content-start">
          {filteredProducts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => addToCart(p)}
              className="text-left bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden hover:border-brand-yellow/50 transition-colors"
            >
              {(p.product_images?.find(i => i.is_primary)?.url ?? p.product_images?.[0]?.url) ? (
                <img src={p.product_images?.find(i => i.is_primary)?.url ?? p.product_images![0].url} alt={p.name} className="w-full h-24 object-cover" />
              ) : (
                <div className="w-full h-24 bg-brand-gray-mid flex items-center justify-center text-3xl text-gray-600">📦</div>
              )}
              <div className="p-2">
                <div className="text-sm text-white font-medium leading-tight truncate">{p.name}</div>
                {p.sku && <div className="text-xs text-gray-500 truncate">{p.sku}</div>}
                <div className="text-brand-yellow text-sm font-bold mt-0.5">{formatCurrency(p.price)}</div>
                {p.stock !== undefined && (
                  <div className={`text-xs ${(p.stock ?? 0) < 5 ? "text-red-400" : "text-gray-500"}`}>
                    Estoque: {p.stock}
                  </div>
                )}
              </div>
            </button>
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-3 text-gray-500 text-sm py-8 text-center">Nenhum produto encontrado.</div>
          )}
        </div>
      </div>

      {/* Right: Cart + checkout */}
      <form action={action} className="w-80 md:w-96 flex flex-col bg-brand-gray-dark overflow-hidden">
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {/* Client (optional) */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Cliente (opcional)</label>
            <select
              name="customer_id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow"
            >
              <option value="">Consumidor final</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
                  <div key={idx} className="bg-brand-gray-mid rounded-xl p-3">
                    <input type="hidden" name={`item_product_id_${idx}`} value={item.product_id} />
                    <input type="hidden" name={`item_description_${idx}`} value={item.description} />
                    <div className="text-sm text-white font-medium truncate mb-2">{item.description}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-brand-gray-dark text-white text-sm hover:bg-brand-gray-light"
                      >−</button>
                      <input
                        type="number"
                        name={`item_quantity_${idx}`}
                        value={item.quantity}
                        onChange={(e) => updateCartQty(idx, parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-12 bg-brand-gray-dark border border-brand-gray-light rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-brand-gray-dark text-white text-sm hover:bg-brand-gray-light"
                      >+</button>
                      <input
                        type="number"
                        name={`item_unit_price_${idx}`}
                        value={item.unit_price}
                        onChange={(e) => updateCartPrice(idx, parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="flex-1 bg-brand-gray-dark border border-brand-gray-light rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateCartQty(idx, 0)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >✕</button>
                    </div>
                    <div className="text-right text-xs text-gray-400 mt-1">
                      = {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input type="hidden" name="items_count" value={cart.length} />
          </div>

          {/* Discount */}
          <input type="hidden" name="discount" value={discount.toFixed(2)} />
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Desconto</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg overflow-hidden border border-brand-gray-light shrink-0">
                <button
                  type="button"
                  onClick={() => { setDiscountType("R$"); setDiscountInput(0); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "R$" ? "bg-brand-yellow text-brand-black" : "bg-brand-gray-mid text-gray-400 hover:text-white"}`}
                >R$</button>
                <button
                  type="button"
                  onClick={() => { setDiscountType("%"); setDiscountInput(0); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${discountType === "%" ? "bg-brand-yellow text-brand-black" : "bg-brand-gray-mid text-gray-400 hover:text-white"}`}
                >%</button>
              </div>
              <input
                type="number"
                value={discountInput || ""}
                onChange={(e) => setDiscountInput(parseFloat(e.target.value) || 0)}
                min="0"
                max={discountType === "%" ? 100 : undefined}
                step={discountType === "%" ? 1 : 0.01}
                placeholder={discountType === "%" ? "0%" : "0,00"}
                className="flex-1 bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow"
              />
            </div>
          </div>

          {/* Payments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Formas de pagamento</span>
              <button
                type="button"
                onClick={addPayment}
                className="text-xs text-brand-yellow hover:text-brand-yellow-dark"
              >+ Adicionar</button>
            </div>
            {payments.map((payment, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  name={`payment_method_${idx}`}
                  value={payment.method}
                  onChange={(e) => updatePayment(idx, "method", e.target.value)}
                  className="flex-1 bg-brand-gray-mid border border-brand-gray-light rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-yellow"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.name} value={m.name}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  name={`payment_amount_${idx}`}
                  value={payment.amount || ""}
                  onChange={(e) => updatePayment(idx, "amount", parseFloat(e.target.value) || 0)}
                  onFocus={idx === 0 ? fillPaymentWithTotal : undefined}
                  min="0"
                  step="0.01"
                  placeholder="R$"
                  className="w-24 bg-brand-gray-mid border border-brand-gray-light rounded-lg px-2 py-1.5 text-sm text-white text-right focus:outline-none focus:border-brand-yellow"
                />
                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePayment(idx)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >✕</button>
                )}
              </div>
            ))}
            <input type="hidden" name="payments_count" value={payments.length} />
          </div>
        </div>

        {/* Footer totals + submit */}
        <div className="p-4 border-t border-brand-gray-mid space-y-2">
          {state?.error && (
            <div className="text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{state.error}</div>
          )}
          <div className="flex justify-between text-sm text-gray-400">
            <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Desconto ({discountPct.toFixed(1)}%)</span>
              <span>- {formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-white border-t border-brand-gray-mid pt-2 mt-1">
            <span>Total</span><span className="text-brand-yellow">{formatCurrency(total)}</span>
          </div>
          {change > 0 && (
            <div className="flex justify-between text-sm text-green-400">
              <span>Troco</span><span>{formatCurrency(change)}</span>
            </div>
          )}
          {change < -0.01 && (
            <div className="flex justify-between text-sm text-red-400">
              <span>Faltando</span><span>{formatCurrency(Math.abs(change))}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || cart.length === 0}
            className="w-full bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-black py-3 rounded-xl transition-colors disabled:opacity-40 text-sm"
          >
            {isPending ? "Finalizando..." : "Finalizar Venda →"}
          </button>
        </div>
      </form>
    </div>
  );
}
