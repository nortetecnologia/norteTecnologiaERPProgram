"use client";

import { useTransition } from "react";
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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as OSStatus;
    startTransition(() => {
      updateOSStatus(osId, newStatus);
    });
  }

  return (
    <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-2">Alterar status</div>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={isPending}
        className="w-full bg-brand-gray-mid border border-brand-gray-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow disabled:opacity-50"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {OS_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      {isPending && <p className="text-xs text-gray-500 mt-1">Salvando...</p>}
    </div>
  );
}
