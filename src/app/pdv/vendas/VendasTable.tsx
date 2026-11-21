"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Sale {
  id: string;
  sale_number: number;
  total: number;
  created_at: string;
  erp_customers?: { name: string } | null;
  erp_pdv_sale_items?: { description: string }[];
}

export default function VendasTable({ sales }: { sales: Sale[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter(
      (s) =>
        String(s.sale_number).includes(term) ||
        (s.erp_customers?.name ?? "").toLowerCase().includes(term) ||
        (s.erp_pdv_sale_items ?? []).some((i) =>
          i.description?.toLowerCase().includes(term)
        )
    );
  }, [sales, search]);

  return (
    <div>
      {/* Live search — separate from filters */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nº, cliente ou produto..."
          className="w-full bg-brand-gray-dark border border-brand-gray-mid rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow"
        />
        {search.trim() && (
          <p className="text-xs text-gray-500 mt-1 ml-1">
            {filtered.length} resultado(s) para &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">Nenhuma venda encontrada.</div>
      ) : (
        <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-brand-gray-mid">
                <th className="text-left px-5 py-3">Nº</th>
                <th className="text-left px-5 py-3">Data</th>
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sale) => (
                <tr key={sale.id} className="border-t border-brand-gray-mid hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 font-mono text-brand-yellow font-bold">
                    #{String(sale.sale_number).padStart(6, "0")}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(sale.created_at)}</td>
                  <td className="px-5 py-3 text-gray-300">
                    {sale.erp_customers?.name ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-green-400">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/pdv/${sale.id}/editar`}
                        className="text-xs px-2.5 py-1 border border-brand-gray-mid text-gray-400 rounded hover:border-gray-400 transition-colors"
                      >
                        ✏️ Editar
                      </Link>
                      <Link
                        href={`/pdv/${sale.id}/recibo`}
                        className="text-xs px-2.5 py-1 border border-brand-gray-mid text-gray-400 rounded hover:border-gray-400 transition-colors"
                      >
                        Ver recibo
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
