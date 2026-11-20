"use client";

import { useState, useTransition } from "react";
import { updateOSStatus } from "../actions";
import { OS_STATUS_LABELS, type OSStatus } from "@/types";

const STATUSES: OSStatus[] = ["awaiting", "in_progress", "done", "delivered", "cancelled"];

export default function OSStatusForm({
  osId,
  currentStatus,
}: {
  osId: string;
  currentStatus: OSStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<OSStatus | null>(null);
  const [cancelledReason, setCancelledReason] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OSStatus;
    if (newStatus === "cancelled") {
      setPendingStatus("cancelled");
      return;
    }
    startTransition(() => {
      updateOSStatus(osId, newStatus);
    });
  }

  function confirmCancel() {
    startTransition(() => {
      updateOSStatus(osId, "cancelled", cancelledReason);
      setPendingStatus(null);
    });
  }

  return (
    <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-2">Alterar status</div>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending || pendingStatus === "cancelled"}
        className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {OS_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {pendingStatus === "cancelled" && (
        <div className="mt-3 space-y-2">
          <label className="text-xs text-gray-400">Motivo do cancelamento (opcional)</label>
          <textarea
            value={cancelledReason}
            onChange={(e) => setCancelledReason(e.target.value)}
            rows={2}
            placeholder="Ex: Cliente desistiu, peça indisponível..."
            className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-400 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmCancel}
              disabled={isPending}
              className="flex-1 text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Confirmar cancelamento
            </button>
            <button
              type="button"
              onClick={() => setPendingStatus(null)}
              className="text-xs px-3 py-1.5 border border-brand-gray-mid text-gray-400 rounded-lg hover:border-gray-400 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isPending && !pendingStatus && <p className="text-xs text-gray-500 mt-1">Salvando...</p>}
    </div>
  );
}
