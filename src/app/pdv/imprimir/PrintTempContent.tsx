"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PrintLayout, PrintData } from "@/components/pdv/PrintLayout";

export default function PrintTempContent() {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") === "thermal" ? "thermal" : "a4") as "a4" | "thermal";
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pdv_print_temp");
      if (!raw) { setError(true); return; }
      const parsed = JSON.parse(raw);
      const dateStr = parsed.date
        ? new Date(parsed.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
        : new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      setData({
        quoteNumber: parsed.quoteNumber ?? "Orçamento",
        dateStr,
        customerName: parsed.customerName ?? "Consumidor final",
        customerPhone: parsed.customerPhone,
        items: parsed.items ?? [],
        discount: parsed.discount ?? 0,
        total: parsed.total ?? 0,
        storeName: parsed.storeName,
        storeAddress: parsed.storeAddress,
        cnpj: parsed.cnpj,
      });
    } catch {
      setError(true);
    }
  }, []);

  if (error) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center" }}>
        <p>Dados não encontrados. Feche esta janela e tente novamente.</p>
        <button onClick={() => window.close()} style={{ marginTop: "16px", padding: "8px 20px", cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center", color: "#666" }}>
        Carregando...
      </div>
    );
  }

  return <PrintLayout data={data} type={type} />;
}
