"use client";

import { useState, useTransition } from "react";
import { cancelSale } from "../../actions";

export default function ReciboActions({ saleId }: { saleId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelSale(saleId);
      if (res?.error) setError(res.error);
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="bg-red-900/40 border border-red-700/50 text-red-400 hover:bg-red-900/60 text-xs px-3 py-1.5 rounded-lg transition-colors"
      >
        🗑 Cancelar venda
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-red-300">Confirmar cancelamento?</span>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Cancelando..." : "Sim, cancelar"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
      >
        Não
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
