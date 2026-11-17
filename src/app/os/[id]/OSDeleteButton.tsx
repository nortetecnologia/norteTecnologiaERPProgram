"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteServiceOrder } from "../actions";

export default function OSDeleteButton({ osId }: { osId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteServiceOrder(osId) as any;
      if (res?.error) setError(res.error);
      else router.push("/os");
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm px-4 py-2 border border-red-800/60 text-red-400 rounded-lg hover:border-red-600 transition-colors"
      >
        🗑 Excluir
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-red-300">Excluir esta OS?</span>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-sm px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Excluindo..." : "Sim, excluir"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-sm px-3 py-2 border border-brand-gray-mid text-gray-400 rounded-lg hover:border-gray-400 transition-colors"
      >
        Cancelar
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
