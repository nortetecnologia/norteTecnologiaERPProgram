"use client";

import { useState } from "react";
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

export function PrintQuoteButton({ quoteId }: { quoteId: string }) {
  const [open, setOpen] = useState(false);

  function handlePrint(type: "a4" | "thermal") {
    window.open(`/pdv/orcamentos/${quoteId}/imprimir?type=${type}`, "_blank");
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 border border-brand-gray-mid text-gray-300 text-sm rounded-xl hover:border-gray-400 transition-colors"
      >
        🖨️ Imprimir
        <span style={{ fontSize: "10px", opacity: 0.7 }}>▼</span>
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50, background: "#1f2937", border: "1px solid #374151", borderRadius: "10px", minWidth: "180px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => handlePrint("a4")}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", color: "#e5e7eb", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#374151")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              📄 Impressão A4
            </button>
            <button
              type="button"
              onClick={() => handlePrint("thermal")}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", background: "transparent", border: "none", borderTop: "1px solid #374151", color: "#e5e7eb", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#374151")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              🧾 Recibo 80mm
            </button>
          </div>
        </>
      )}
    </div>
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
