"use client";

import { useRouter } from "next/navigation";
import { deleteQuoteAction } from "./actions";

interface CartItem {
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Props {
  quoteId: string;
  cartItems: CartItem[];
  customerId: string | null;
  customerName: string | null;
  discount: number;
}

export function FecharVendaButton({ cartItems, customerId, customerName, discount }: Omit<Props, "quoteId">) {
  const router = useRouter();

  const handleFecharVenda = () => {
    try {
      localStorage.setItem(
        "pdv_draft_pdv-default",
        JSON.stringify({
          cart: cartItems,
          customerId: customerId ?? "",
          customerName: customerName ?? "",
          discountInput: discount ?? 0,
          discountType: "R$",
        })
      );
    } catch {}
    router.push("/pdv");
  };

  return (
    <button
      type="button"
      onClick={handleFecharVenda}
      className="flex items-center gap-2 px-5 py-2.5 bg-brand-yellow text-brand-black text-sm font-bold rounded-xl hover:bg-yellow-400 transition-colors"
    >
      Fechar Venda →
    </button>
  );
}

export function DeleteQuoteButton({ quoteId }: { quoteId: string }) {
  return (
    <form
      action={deleteQuoteAction}
      onSubmit={(e) => {
        if (!confirm("Excluir este orçamento? Esta ação não pode ser desfeita.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={quoteId} />
      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-2 border border-red-800/60 text-red-400 text-sm rounded-xl hover:bg-red-900/20 transition-colors"
      >
        Excluir orçamento
      </button>
    </form>
  );
}
