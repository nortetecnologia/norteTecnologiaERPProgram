"use client";

import { useEffect } from "react";

interface PrintItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface PrintData {
  quoteNumber: string;
  dateStr: string;
  customerName: string;
  customerPhone?: string;
  items: PrintItem[];
  discount: number;
  total: number;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
  cnpj?: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Sep() {
  return <div style={{ borderTop: "1.5px dashed #000", margin: "8px 0" }} />;
}

function Stars() {
  return (
    <div style={{ textAlign: "center", letterSpacing: "3px", fontSize: "10px", color: "#000", margin: "6px 0" }}>
      * * * * * * * * * * * * * *
    </div>
  );
}

export function PrintLayout({ data, type }: { data: PrintData; type: "a4" | "thermal" }) {
  const storeName = (data.storeName ?? "NORTE TECNOLOGIA").toUpperCase();
  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  useEffect(() => {
    document.documentElement.style.background = "#f0f0f0";
    document.body.style.background = "#f0f0f0";
    document.body.style.color = "#000";
    document.title = `${data.quoteNumber} — ${storeName}`;
    const t = setTimeout(() => window.print(), 700);
    return () => {
      clearTimeout(t);
      document.documentElement.style.background = "";
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, [data.quoteNumber, storeName]);

  const isA4 = type === "a4";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body { background: #f0f0f0 !important; color: #000 !important; }
        @page { size: ${isA4 ? "A4" : "80mm auto"}; margin: ${isA4 ? "10mm 15mm" : "4mm"}; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: #fff !important; }
          .receipt-wrap { padding: 0 !important; min-height: auto !important; }
          .receipt { box-shadow: none !important; padding: 0 !important; }
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      `}} />

      {/* Toolbar */}
      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#e5e7eb", borderBottom: "1px solid #d1d5db", display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", zIndex: 9999, fontFamily: "sans-serif" }}>
        <button onClick={() => window.print()} style={{ background: "#111", color: "white", border: "none", padding: "5px 16px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
          Imprimir
        </button>
        <button onClick={() => window.close()} style={{ background: "#e5e7eb", color: "#374151", border: "1px solid #d1d5db", padding: "5px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
          Fechar
        </button>
        <span style={{ fontSize: "11px", color: "#6b7280" }}>
          {isA4 ? "Formato A4" : "Recibo 80mm"}
        </span>
      </div>

      <div className="receipt-wrap" style={{ display: "flex", justifyContent: "center", padding: "64px 0 24px", minHeight: "100vh" }}>
        <div
          className="receipt"
          style={{
            background: "#fff",
            width: isA4 ? "auto" : "320px",
            maxWidth: isA4 ? "680px" : "320px",
            padding: "20px 18px 24px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "12px",
            fontWeight: 600,
            color: "#000",
            boxShadow: "0 2px 16px rgba(0,0,0,0.15)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="NT"
              style={{ height: "52px", width: "auto", display: "block", margin: "0 auto 6px", filter: "grayscale(100%) contrast(10) brightness(0.15)" }}
            />
            <div style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "2px" }}>{storeName}</div>
            {data.storeAddress && (
              <div style={{ fontSize: "10px", color: "#000", fontWeight: "600", marginTop: "2px" }}>{data.storeAddress}</div>
            )}
            {data.storePhone && (
              <div style={{ fontSize: "10px", color: "#000", fontWeight: "600" }}>Tel: {data.storePhone}</div>
            )}
            {data.cnpj && (
              <div style={{ fontSize: "10px", color: "#000", fontWeight: "600" }}>CNPJ: {data.cnpj}</div>
            )}
          </div>

          <Stars />

          <div style={{ textAlign: "center", fontWeight: "900", fontSize: "13px", letterSpacing: "1px", marginBottom: "4px" }}>
            ORÇAMENTO
          </div>

          <Sep />

          {/* Number + date */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "900" }}>{data.quoteNumber}</span>
            <span>{data.dateStr}</span>
          </div>

          {/* Customer */}
          <div style={{ marginTop: "4px" }}>
            <span style={{ fontWeight: "700" }}>Cliente: </span>
            <span style={{ fontWeight: "900" }}>{data.customerName}</span>
          </div>
          {data.customerPhone && (
            <div style={{ marginTop: "2px", fontSize: "11px" }}>
              <span style={{ fontWeight: "700" }}>Tel: </span>
              <span>{data.customerPhone}</span>
            </div>
          )}

          <Sep />

          {/* Items header */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "900", marginBottom: "4px", textTransform: "uppercase" }}>
            <span>Descrição</span>
            <span>Valor</span>
          </div>

          {/* Items */}
          {data.items.map((item, i) => (
            <div key={i} style={{ marginBottom: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ flex: 1, marginRight: "8px", wordBreak: "break-word", fontWeight: "700" }}>{item.description}</span>
                <span style={{ flexShrink: 0, fontWeight: "900" }}>{fmt(item.quantity * item.unit_price)}</span>
              </div>
              {item.quantity > 1 && (
                <div style={{ fontSize: "11px", paddingLeft: "8px" }}>
                  {item.quantity} × {fmt(item.unit_price)}
                </div>
              )}
            </div>
          ))}

          <Sep />

          {/* Discount */}
          {data.discount > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Desconto</span>
                <span>- {fmt(data.discount)}</span>
              </div>
            </>
          )}

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "900", fontSize: "16px", marginTop: "4px", paddingTop: "5px", borderTop: "3px solid #000" }}>
            <span>TOTAL ESTIMADO</span>
            <span>{fmt(data.total)}</span>
          </div>

          <Sep />

          {/* Validity note */}
          <div style={{ fontSize: "10px", fontWeight: "600", textAlign: "center", color: "#000", marginTop: "4px" }}>
            Validade: 7 dias · Sujeito a alteração
          </div>

          <Stars />

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: "8px" }}>
            <div style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "1px" }}>OBRIGADO!</div>
            <div style={{ fontSize: "10px", fontWeight: "600", marginTop: "2px" }}>Volte sempre · {storeName}</div>
          </div>

          {/* A4-only: signature section */}
          {isA4 && (
            <>
              <Sep />
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "32px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #000", width: "180px", paddingTop: "4px", fontSize: "10px" }}>{storeName}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ borderTop: "1px solid #000", width: "180px", paddingTop: "4px", fontSize: "10px" }}>Cliente</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
