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
  cnpj?: string;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PrintLayout({ data, type }: { data: PrintData; type: "a4" | "thermal" }) {
  const storeName = data.storeName || "Norte Tecnologia";

  useEffect(() => {
    document.documentElement.style.background = "white";
    document.body.style.background = "white";
    document.body.style.color = "#111";
    document.title = `${data.quoteNumber} — ${storeName}`;
    const t = setTimeout(() => window.print(), 700);
    return () => {
      clearTimeout(t);
      document.documentElement.style.background = "";
      document.body.style.background = "";
      document.body.style.color = "";
    };
  }, [data.quoteNumber, storeName]);

  const subtotal = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body, #__next { background: white !important; color: #111 !important; }
        @page { size: ${type === "a4" ? "A4" : "80mm auto"}; margin: ${type === "a4" ? "15mm" : "3mm 5mm"}; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print { .no-print { display: none !important; } body { background: white !important; padding-top: 0 !important; } }
      `}} />

      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#f3f4f6", borderBottom: "1px solid #d1d5db", display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", zIndex: 9999, fontFamily: "sans-serif" }}>
        <button onClick={() => window.print()} style={{ background: "#111", color: "white", border: "none", padding: "6px 18px", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
          Imprimir
        </button>
        <button onClick={() => window.close()} style={{ background: "#e5e7eb", color: "#374151", border: "none", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "13px" }}>
          Fechar
        </button>
        <span style={{ fontSize: "11px", color: "#6b7280", marginLeft: "8px" }}>
          {type === "a4" ? "Formato A4" : "Recibo Térmico (80mm)"}
        </span>
      </div>

      <div style={{ paddingTop: "50px", background: "white", minHeight: "100vh" }}>
        {type === "a4"
          ? <A4Content data={data} subtotal={subtotal} storeName={storeName} />
          : <ThermalContent data={data} subtotal={subtotal} storeName={storeName} />
        }
      </div>
    </>
  );
}

function A4Content({ data, subtotal, storeName }: { data: PrintData; subtotal: number; storeName: string }) {
  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111", padding: "24px 32px", maxWidth: "190mm", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", paddingBottom: "14px", borderBottom: "2px solid #111" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.5px" }}>{storeName}</div>
          {data.storeAddress && <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{data.storeAddress}</div>}
          {data.cnpj && <div style={{ fontSize: "10px", color: "#888", marginTop: "1px" }}>CNPJ: {data.cnpj}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>Orçamento</div>
          <div style={{ fontSize: "20px", fontWeight: 700, fontFamily: "monospace" }}>{data.quoteNumber}</div>
          <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{data.dateStr}</div>
        </div>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: "18px", padding: "10px 14px", border: "1px solid #e5e7eb", borderRadius: "6px", background: "#fafafa" }}>
        <div style={{ fontSize: "9px", color: "#999", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "3px" }}>Cliente</div>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>{data.customerName}</div>
        {data.customerPhone && <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{data.customerPhone}</div>}
      </div>

      {/* Items table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "14px" }}>
        <thead>
          <tr style={{ background: "#111", color: "white" }}>
            <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: "11px" }}>Item</th>
            <th style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600, fontSize: "11px", width: "55px" }}>Qtd</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: "11px", width: "100px" }}>Unit.</th>
            <th style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: "11px", width: "100px" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "white" : "#fafafa" }}>
              <td style={{ padding: "8px 10px" }}>{item.description}</td>
              <td style={{ padding: "8px 10px", textAlign: "center" }}>{item.quantity}</td>
              <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmt(item.unit_price)}</td>
              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 500 }}>{fmt(item.quantity * item.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
        <div style={{ width: "230px" }}>
          {data.discount > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#555" }}>
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "12px", color: "#c00" }}>
                <span>Desconto</span><span>- {fmt(data.discount)}</span>
              </div>
            </>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", fontSize: "16px", fontWeight: 700, borderTop: "2px solid #111", marginTop: "4px" }}>
            <span>Total</span><span>{fmt(data.total)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "14px" }}>
        <p style={{ fontSize: "10px", color: "#999", marginBottom: "30px" }}>
          Orçamento válido por 7 dias a partir da data de emissão. Preços sujeitos a alteração sem aviso prévio.
        </p>
        <div style={{ display: "flex", gap: "80px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #333", paddingTop: "4px", width: "160px", fontSize: "10px", color: "#555" }}>{storeName}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid #333", paddingTop: "4px", width: "160px", fontSize: "10px", color: "#555" }}>Cliente</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThermalContent({ data, subtotal, storeName }: { data: PrintData; subtotal: number; storeName: string }) {
  return (
    <div style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: "11px", color: "#000", padding: "8px 10px", maxWidth: "72mm", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <div style={{ fontWeight: "bold", fontSize: "14px", textTransform: "uppercase" }}>{storeName}</div>
        {data.storeAddress && <div style={{ fontSize: "10px" }}>{data.storeAddress}</div>}
        {data.cnpj && <div style={{ fontSize: "10px" }}>CNPJ: {data.cnpj}</div>}
      </div>

      <Dashes />

      <div>ORCAMENTO: {data.quoteNumber}</div>
      <div>DATA: {data.dateStr}</div>
      <div>CLIENTE: {data.customerName.length > 24 ? data.customerName.substring(0, 24) + ".." : data.customerName}</div>
      {data.customerPhone && <div>TEL: {data.customerPhone}</div>}

      <Dashes />

      {data.items.map((item, i) => (
        <div key={i} style={{ marginBottom: "4px" }}>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.description}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#555" }}>{item.quantity} x {fmt(item.unit_price)}</span>
            <span style={{ fontWeight: "bold" }}>{fmt(item.quantity * item.unit_price)}</span>
          </div>
        </div>
      ))}

      <Dashes />

      {data.discount > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>SUBTOTAL</span><span>{fmt(subtotal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>DESCONTO</span><span>-{fmt(data.discount)}</span>
          </div>
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px", marginTop: "2px" }}>
        <span>TOTAL</span><span>{fmt(data.total)}</span>
      </div>

      <Dashes />

      <div style={{ textAlign: "center", fontSize: "10px", lineHeight: 1.7 }}>
        <div>Valido por 7 dias.</div>
        <div>Obrigado pela preferencia!</div>
      </div>
    </div>
  );
}

function Dashes() {
  return <div style={{ borderTop: "1px dashed #aaa", margin: "6px 0" }} />;
}
