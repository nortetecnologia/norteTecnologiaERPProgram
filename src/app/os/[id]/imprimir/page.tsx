import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatPhone, formatCPFCNPJ } from "@/lib/utils";
import { OS_STATUS_LABELS, type ServiceOrder } from "@/types";
import PrintButtons from "./PrintButtons";

interface StoreSettings {
  store_name: string;
  phone_number?: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  city?: string;
  state_abbr?: string;
  cnpj?: string;
}

function hr(thick = false) {
  return <div style={{ borderTop: thick ? "2px solid #000" : "1px solid #000", margin: "5px 0" }} />;
}

function field(label: string, value?: string | null, style?: CSSProperties) {
  return (
    <span style={style}>
      <span style={{ fontWeight: "900" }}>{label}</span>{" "}
      <span style={{ fontWeight: "600" }}>{value ?? ""}</span>
    </span>
  );
}

export default async function OSPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sem_valores?: string }>;
}) {
  const { id } = await params;
  const { sem_valores } = await searchParams;
  const hideValues = sem_valores === "1";

  const supabase = createAdminClient();
  const [{ data: os }, { data: store }] = await Promise.all([
    supabase
      .from("erp_service_orders")
      .select("*, erp_customers(*), erp_service_order_items(*, products(name, sku))")
      .eq("id", id)
      .single<ServiceOrder>(),
    supabase.from("store_settings").select("*").single<StoreSettings>(),
  ]);

  if (!os) notFound();

  const customer = (os.erp_customers as any) ?? {};
  const items = os.erp_service_order_items ?? [];
  const itemsTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const laborCost = os.labor_cost ?? 0;
  const discount = os.discount ?? 0;
  const total = laborCost + itemsTotal - discount;

  const storeName = store?.store_name ?? "Norte Tecnologia";
  const storePhone = store?.phone_number
    ? formatPhone(store.phone_number)
    : store?.whatsapp_number
    ? formatPhone(store.whatsapp_number)
    : "";
  const storeAddressParts = [store?.address, store?.city, store?.state_abbr].filter(Boolean);
  const storeAddress = storeAddressParts.join(" - ");
  const cnpj = (store as any)?.cnpj ?? "";

  const createdAt = new Date(os.created_at);
  const hora = createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const data = createdAt.toLocaleDateString("pt-BR");

  const osNum = String(os.number).padStart(6, "0");

  const page: CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "12pt",
    fontWeight: "600",
    color: "#000",
    background: "#fff",
    maxWidth: "210mm",
    margin: "0 auto",
    padding: "10mm",
    lineHeight: "1.5",
  };

  const bold: CSSProperties = { fontWeight: "900" };
  const small: CSSProperties = { fontSize: "10pt", fontWeight: "600" };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: #fff; }
          @page { size: A4 portrait; margin: 0.8cm; }
        }
        .no-print {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: #f3f4f6;
          border-bottom: 1px solid #d1d5db;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .btn-print {
          background: #111; color: #fff;
          border: none; padding: 8px 16px; border-radius: 6px;
          font-size: 13px; cursor: pointer;
        }
        .btn-secondary {
          background: #e5e7eb; color: #374151;
          border: none; padding: 8px 16px; border-radius: 6px;
          font-size: 13px; cursor: pointer; text-decoration: none;
        }
      `}</style>

      {/* Barra de ações — oculta ao imprimir */}
      <PrintButtons osId={id} hideValues={hideValues} />

      {/* Documento imprimível */}
      <div style={page}>

        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" style={{ height: "60px", width: "auto" }} />
            <div>
              <div style={{ fontSize: "16pt", fontWeight: "900", letterSpacing: "1px" }}>{storeName.toUpperCase()}</div>
              {storePhone && <div style={{ ...small, fontWeight: "700" }}>{storePhone}</div>}
              {storeAddress && <div style={{ ...small, fontWeight: "700" }}>{storeAddress}</div>}
            </div>
          </div>
          {cnpj && (
            <div style={{ textAlign: "right", ...small }}>
              CNPJ {cnpj}
            </div>
          )}
        </div>

        {hr(true)}

        {/* ── Número da OS + Data ───────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0" }}>
          <div style={{ fontSize: "14pt", ...bold }}>ORDEM DE SERVICO {osNum}</div>
          <div style={{ ...small, fontWeight: "700" }}>Hora: {hora}&nbsp;&nbsp;&nbsp;Data: {data}</div>
        </div>

        {hr(true)}

        {/* ── Dados do cliente ─────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", ...small, margin: "4px 0" }}>
          <tbody>
            <tr>
              <td style={{ width: "60%" }}>
                {field("Cliente .:", customer.name)}
                {customer.phone ? ` - ${formatPhone(customer.phone)}` : ""}
              </td>
              <td>{field("Bairro:", "")}</td>
            </tr>
            <tr>
              <td colSpan={2}>{field("Endereço:", customer.address ?? "")}</td>
            </tr>
            <tr>
              <td style={{ width: "30%" }}>{field("CPF/Cnpj:", customer.cpf_cnpj ? formatCPFCNPJ(customer.cpf_cnpj) : "")}</td>
              <td style={{ width: "10%" }}>{field("Cpl:", "")}</td>
              <td style={{ width: "35%" }}>{field("Cidade:", customer.city ?? "")}</td>
              <td style={{ width: "10%" }}>{field("UF:", "")}</td>
              <td style={{ width: "15%" }}>{field("CEP:", "")}</td>
            </tr>
          </tbody>
        </table>

        {hr()}

        {/* ── Equipamento ──────────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", ...small, margin: "4px 0" }}>
          <tbody>
            <tr>
              <td style={{ width: "40%" }}>{field("Equipamento:", os.equipment ?? "")}</td>
              <td style={{ width: "35%" }}>{field("Modelo:", "")}</td>
              <td style={{ width: "25%" }}>{field("Marca:", "")}</td>
            </tr>
            <tr>
              <td colSpan={3}>{field("Nº de Série:", os.serial_number ?? "")}</td>
            </tr>
            <tr>
              <td colSpan={3}>{field("Acessórios.:", "")}</td>
            </tr>
          </tbody>
        </table>

        {hr()}

        {/* ── Problemas / Serviço ──────────────────────────── */}
        <div style={{ margin: "4px 0", ...small }}>
          <div style={bold}>Problema Informado:</div>
          <div style={{ paddingLeft: "4px", minHeight: "20px" }}>{os.title}</div>
        </div>

        <div style={{ margin: "4px 0", ...small }}>
          <div style={bold}>Problema Constatado:</div>
          <div style={{ paddingLeft: "4px", minHeight: "20px" }}>{os.description ?? ""}</div>
        </div>

        <div style={{ margin: "4px 0", ...small }}>
          <div style={bold}>Servico Executado:</div>
          <div style={{ paddingLeft: "4px", minHeight: "20px" }}></div>
        </div>

        {hr()}

        {/* ── Tabela de itens ──────────────────────────────── */}
        <table style={{ width: "100%", borderCollapse: "collapse", ...small }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th style={{ textAlign: "left", padding: "3px 4px", fontWeight: "900" }}>Referencia</th>
              <th style={{ textAlign: "left", padding: "3px 4px", fontWeight: "900" }}>Descrição do Item</th>
              <th style={{ textAlign: "center", padding: "3px 4px", fontWeight: "900" }}>Uni</th>
              {!hideValues && (
                <>
                  <th style={{ textAlign: "right", padding: "3px 4px", fontWeight: "900" }}>Valor</th>
                  <th style={{ textAlign: "right", padding: "3px 4px", fontWeight: "900" }}>Qtd</th>
                  <th style={{ textAlign: "right", padding: "3px 4px", fontWeight: "900" }}>Desc.</th>
                  <th style={{ textAlign: "right", padding: "3px 4px", fontWeight: "900" }}>Total</th>
                </>
              )}
              {hideValues && (
                <th style={{ textAlign: "right", padding: "3px 4px", fontWeight: "900" }}>Qtd</th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #666" }}>
                <td style={{ padding: "2px 4px" }}>{(item.products as any)?.sku ?? ""}</td>
                <td style={{ padding: "2px 4px" }}>{item.description}</td>
                <td style={{ textAlign: "center", padding: "2px 4px" }}>UNI</td>
                {!hideValues && (
                  <>
                    <td style={{ textAlign: "right", padding: "2px 4px" }}>
                      {item.unit_price.toFixed(2).replace(".", ",")}
                    </td>
                    <td style={{ textAlign: "right", padding: "2px 4px" }}>
                      {item.quantity.toFixed(1)}
                    </td>
                    <td style={{ textAlign: "right", padding: "2px 4px" }}></td>
                    <td style={{ textAlign: "right", padding: "2px 4px" }}>
                      {(item.quantity * item.unit_price).toFixed(2).replace(".", ",")}
                    </td>
                  </>
                )}
                {hideValues && (
                  <td style={{ textAlign: "right", padding: "2px 4px" }}>{item.quantity}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {hr()}

        {/* ── Rodapé: Responsável + Totais ─────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", ...small, margin: "4px 0" }}>
          {/* Coluna esquerda */}
          <div style={{ flex: 1 }}>
            <div>{field("Responsável:", "")}</div>
            <div>{field("Situação Atual:", OS_STATUS_LABELS[os.status].toUpperCase())}</div>
            <div>
              {field("Entrega:", os.estimated_at ? formatDate(os.estimated_at) : "")}
            </div>
            <div>{field("Condições de Pagamento:", "")}</div>
          </div>

          {/* Coluna direita — totais */}
          {!hideValues && (
            <div style={{ textAlign: "right", minWidth: "200px", fontWeight: "700" }}>
              <div>
                VALOR PRODUTOS:{" "}
                <span style={{ display: "inline-block", minWidth: "80px", textAlign: "right" }}>
                  {itemsTotal > 0 ? itemsTotal.toFixed(2).replace(".", ",") : ""}
                </span>
              </div>
              <div>
                VALOR SERVICOS:{" "}
                <span style={{ display: "inline-block", minWidth: "80px", textAlign: "right" }}>
                  {laborCost > 0 ? laborCost.toFixed(2).replace(".", ",") : ""}
                </span>
              </div>
              <div>
                DESLOCAMENTO :{" "}
                <span style={{ display: "inline-block", minWidth: "80px", textAlign: "right" }}></span>
              </div>
              <div>
                DESCONTO :{" "}
                <span style={{ display: "inline-block", minWidth: "80px", textAlign: "right" }}>
                  {discount > 0 ? discount.toFixed(2).replace(".", ",") : ""}
                </span>
              </div>
              <div style={{ ...bold, fontSize: "12pt", borderTop: "2px solid #000", marginTop: "3px", paddingTop: "3px" }}>
                VALOR TOTAL :{" "}
                <span style={{ display: "inline-block", minWidth: "80px", textAlign: "right" }}>
                  {total.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          )}
        </div>

        {hr()}

        {/* ── Aviso + Assinatura ───────────────────────────── */}
        <div style={{ ...small, fontWeight: "700", marginTop: "6px" }}>
          ESTE DOCUMENTO NÃO VALE COMO RECIBO DE PAGAMENTO
        </div>

        <div style={{ marginTop: "24px", ...small, fontWeight: "700" }}>
          Visto_______________________________________________
        </div>

      </div>
    </>
  );
}
