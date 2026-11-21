"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate, formatOSNumber } from "@/lib/utils";
import { OS_STATUS_LABELS, OS_STATUS_COLORS, type ServiceOrder } from "@/types";

export default function OSListClient({ orders }: { orders: ServiceOrder[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;

    // Parse numeric id from NT-XXXXX or plain digits or #XXXXX
    let numSearch: number | null = null;
    const stripped = term.replace(/^(nt-|#)/, "");
    const parsed = parseInt(stripped);
    if (!isNaN(parsed) && String(parsed) === stripped.replace(/^0+/, "") || stripped === "0") {
      numSearch = parsed;
    }
    if (!isNaN(parsed)) numSearch = parsed;

    return orders.filter((os) =>
      (os.title ?? "").toLowerCase().includes(term) ||
      ((os as any).equipment ?? "").toLowerCase().includes(term) ||
      ((os as any).serial_number ?? "").toLowerCase().includes(term) ||
      formatOSNumber((os as any).number).toLowerCase().includes(term) ||
      ((os.erp_customers as any)?.name ?? "").toLowerCase().includes(term) ||
      ((os as any).customer_name ?? "").toLowerCase().includes(term) ||
      (numSearch !== null && (os as any).number === numSearch)
    );
  }, [orders, search]);

  return (
    <div>
      {/* Live text search — separate from server filters */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título, cliente, nº OS (NT-00001), equipamento, serial..."
          className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
          autoComplete="off"
        />
        {search.trim() && (
          <p className="text-xs text-gray-500 mt-1 ml-1">
            {filtered.length} resultado(s) para &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Nenhuma OS encontrada.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((os) => (
            <Link
              key={os.id}
              href={`/os/${os.id}`}
              className="flex items-center gap-4 bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-5 py-4 hover:border-brand-yellow/50 transition-colors"
            >
              <div className="font-mono text-sm text-brand-yellow font-bold w-20 shrink-0">
                {formatOSNumber((os as any).number)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{os.title}</div>
                <div className="text-xs text-gray-500">
                  {(os.erp_customers as any)?.name ?? "Cliente não encontrado"}
                  {(os as any).equipment && ` · ${(os as any).equipment}`}
                  {(os as any).serial_number && (
                    <span className="text-gray-600"> · S/N: {(os as any).serial_number}</span>
                  )}
                </div>
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${OS_STATUS_COLORS[os.status]}`}>
                {OS_STATUS_LABELS[os.status]}
              </div>
              <div className="text-xs text-gray-500 shrink-0 hidden md:block">
                {formatDate(os.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
