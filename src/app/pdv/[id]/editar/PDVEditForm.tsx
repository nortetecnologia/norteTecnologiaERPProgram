"use client";

import { useState, useActionState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Item { product_id: string; description: string; quantity: number; unit_price: number }
interface Payment { method: string; amount: number }
interface Customer { id: string; name: string }
interface Product { id: string; name: string; price: number; sku?: string }
interface PaymentMethodOption { name: string; label: string }

interface InitialData {
  customer_id: string;
  discount: number;
  items: Item[];
  payments: Payment[];
}

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro", pix: "Pix", debito: "Débito",
  credito_1x: "Crédito 1x", credito_2x: "Crédito 2x", credito_3x: "Crédito 3x",
  credito_6x: "Crédito 6x", credito_12x: "Crédito 12x",
};

export default function PDVEditForm({
  serverAction,
  initialData,
  customers,
  products,
  paymentMethods,
}: {
  serverAction: (prevState: unknown, formData: FormData) => Promise<any>;
  initialData: InitialData;
  customers: Customer[];
  products: Product[];
  paymentMethods: PaymentMethodOption[];
}) {
  const defaultMethod = paymentMethods[0]?.name ?? "pix";
  const [state, action, isPending] = useActionState(serverAction, null);

  const [items, setItems] = useState<Item[]>(
    initialData.items.length > 0
      ? initialData.items
      : [{ product_id: "", description: "", quantity: 1, unit_price: 0 }]
  );
  const [payments, setPayments] = useState<Payment[]>(
    initialData.payments.length > 0
      ? initialData.payments
      : [{ method: defaultMethod, amount: 0 }]
  );
  const [discountInput, setDiscountInput] = useState(initialData.discount);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - discountInput);
  const paidTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);

  function addItem() {
    setItems((prev) => [...prev, { product_id: "", description: "", quantity: 1, unit_price: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof Item, value: string | number) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function selectProduct(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItems((prev) => prev.map((item, i) =>
        i === idx ? { ...item, product_id: productId, description: product.name, unit_price: product.price } : item
      ));
    }
  }

  function addPayment() {
    setPayments((prev) => [...prev, { method: defaultMethod, amount: 0 }]);
  }

  function removePayment(idx: number) {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePayment(idx: number, field: keyof Payment, value: string | number) {
    setPayments((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  const inputCls = "w-full bg-brand-gray-dark border border-brand-gray-mid rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow";

  return (
    <form action={action} className="space-y-5">
      {/* Customer */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
        <label className="text-xs text-gray-500 block mb-1">Cliente</label>
        <select name="customer_id" defaultValue={initialData.customer_id} className={inputCls}>
          <option value="">Sem cliente</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-300 mb-3">Itens</div>
        <input type="hidden" name="items_count" value={items.length} />
        {items.map((item, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-5">
              {idx === 0 && <div className="text-xs text-gray-500 mb-1">Produto / Descrição</div>}
              <select
                className={inputCls + " mb-1"}
                value={item.product_id}
                onChange={(e) => selectProduct(idx, e.target.value)}
              >
                <option value="">Avulso</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <input
                type="hidden"
                name={`item_product_id_${idx}`}
                value={item.product_id}
              />
              <input
                className={inputCls}
                name={`item_description_${idx}`}
                value={item.description}
                onChange={(e) => updateItem(idx, "description", e.target.value)}
                placeholder="Descrição"
              />
            </div>
            <div className="col-span-2">
              {idx === 0 && <div className="text-xs text-gray-500 mb-1">Qtd</div>}
              <input
                type="number"
                className={inputCls}
                name={`item_quantity_${idx}`}
                value={item.quantity}
                min={1}
                onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="col-span-3">
              {idx === 0 && <div className="text-xs text-gray-500 mb-1">Preço Unit.</div>}
              <input
                type="number"
                className={inputCls}
                name={`item_unit_price_${idx}`}
                value={item.unit_price}
                step="0.01"
                min={0}
                onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="col-span-2 text-right text-sm text-gray-400">
              {idx === 0 && <div className="text-xs text-gray-500 mb-1">Total</div>}
              <div className="py-2">{formatCurrency(item.quantity * item.unit_price)}</div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="text-red-500 text-xs">✕</button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="mt-2 text-xs text-brand-yellow hover:text-brand-yellow/80 transition-colors"
        >
          + Adicionar item
        </button>
      </div>

      {/* Discount */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
        <label className="text-xs text-gray-500 block mb-1">Desconto (R$)</label>
        <input
          type="number"
          name="discount"
          className={inputCls}
          value={discountInput}
          step="0.01"
          min={0}
          onChange={(e) => setDiscountInput(parseFloat(e.target.value) || 0)}
        />
      </div>

      {/* Payments */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-300 mb-3">Pagamentos</div>
        <input type="hidden" name="payments_count" value={payments.length} />
        {payments.map((payment, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-6">
              {idx === 0 && <div className="text-xs text-gray-500 mb-1">Forma</div>}
              <select
                className={inputCls}
                name={`payment_method_${idx}`}
                value={payment.method}
                onChange={(e) => updatePayment(idx, "method", e.target.value)}
              >
                {paymentMethods.map((m) => (
                  <option key={m.name} value={m.name}>{m.label}</option>
                ))}
                {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                  paymentMethods.find((m) => m.name === k) ? null : (
                    <option key={k} value={k}>{v}</option>
                  )
                ))}
              </select>
            </div>
            <div className="col-span-4">
              {idx === 0 && <div className="text-xs text-gray-500 mb-1">Valor</div>}
              <input
                type="number"
                className={inputCls}
                name={`payment_amount_${idx}`}
                value={payment.amount}
                step="0.01"
                min={0}
                onChange={(e) => updatePayment(idx, "amount", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="col-span-2 text-right">
              {payments.length > 1 && (
                <button type="button" onClick={() => removePayment(idx)} className="text-red-500 text-xs py-2">✕</button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addPayment}
          className="mt-2 text-xs text-brand-yellow hover:text-brand-yellow/80 transition-colors"
        >
          + Adicionar pagamento
        </button>
      </div>

      {/* Summary */}
      <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4 space-y-1 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
        </div>
        {discountInput > 0 && (
          <div className="flex justify-between text-red-400">
            <span>Desconto</span><span>- {formatCurrency(discountInput)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-white text-base pt-1 border-t border-brand-gray-mid">
          <span>Total</span><span className="text-brand-yellow">{formatCurrency(total)}</span>
        </div>
        <div className={`flex justify-between text-xs mt-1 ${Math.abs(paidTotal - total) > 0.01 ? "text-red-400" : "text-green-400"}`}>
          <span>Pago</span><span>{formatCurrency(paidTotal)}</span>
        </div>
      </div>

      {state?.error && (
        <div className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-brand-yellow hover:bg-brand-yellow/90 text-brand-dark font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {isPending ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
