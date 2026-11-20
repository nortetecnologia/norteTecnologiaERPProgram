import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function buildDateRange(ano: string, mes: string, dia: string) {
  const year = parseInt(ano) || new Date().getFullYear();
  if (mes && dia) {
    const m = parseInt(mes) - 1;
    const d = parseInt(dia);
    return {
      start: new Date(year, m, d, 0, 0, 0).toISOString(),
      end: new Date(year, m, d, 23, 59, 59).toISOString(),
    };
  }
  if (mes) {
    const m = parseInt(mes) - 1;
    return {
      start: new Date(year, m, 1).toISOString(),
      end: new Date(year, m + 1, 0, 23, 59, 59).toISOString(),
    };
  }
  return {
    start: new Date(year, 0, 1).toISOString(),
    end: new Date(year, 11, 31, 23, 59, 59).toISOString(),
  };
}

function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cols: (string | number | null | undefined)[]): string {
  return cols.map(escapeCSV).join(",");
}

export async function GET(req: NextRequest) {
  const anonClient = await createClient();
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = req.nextUrl;
  const aba = searchParams.get("aba") === "os" ? "os" : "vendas";
  const ano = searchParams.get("ano") ?? String(new Date().getFullYear());
  const mes = searchParams.get("mes") ?? "";
  const dia = searchParams.get("dia") ?? "";
  const clienteId = searchParams.get("cliente_id") ?? "";

  const { start, end } = buildDateRange(ano, mes, dia);
  const supabase = createAdminClient();

  if (aba === "vendas") {
    let q = supabase
      .from("erp_pdv_sales")
      .select("sale_number, total, discount, created_at, erp_customers(name), erp_pdv_sale_payments(method, amount)")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });
    if (clienteId) q = q.eq("customer_id", clienteId);
    const { data } = await q;
    const sales = data ?? [];

    const lines: string[] = [
      row(["Nº Venda", "Data", "Hora", "Cliente", "Desconto (R$)", "Total (R$)", "Formas de Pagamento"]),
    ];
    for (const s of sales) {
      const dt = new Date(s.created_at);
      const date = dt.toLocaleDateString("pt-BR");
      const time = dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const payments = ((s as any).erp_pdv_sale_payments ?? [])
        .map((p: any) => `${p.method}:${Number(p.amount).toFixed(2)}`)
        .join("; ");
      lines.push(row([
        String((s as any).sale_number).padStart(6, "0"),
        date,
        time,
        (s as any).erp_customers?.name ?? "",
        Number((s as any).discount ?? 0).toFixed(2),
        Number((s as any).total ?? 0).toFixed(2),
        payments,
      ]));
    }
    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="vendas-${ano}${mes ? `-${mes.padStart(2,"0")}` : ""}${dia ? `-${dia.padStart(2,"0")}` : ""}.csv"`,
      },
    });
  }

  // aba === "os"
  let q = supabase
    .from("erp_service_orders")
    .select(`
      number, title, status, equipment, labor_cost, discount, created_at, cancelled_reason,
      erp_customers(name),
      erp_service_order_items(description, quantity, unit_price)
    `)
    .gte("created_at", start)
    .lte("created_at", end)
    .order("created_at", { ascending: false });
  if (clienteId) q = q.eq("customer_id", clienteId);
  const { data } = await q;
  const osList = data ?? [];

  const lines: string[] = [
    row(["Nº OS", "Data", "Cliente", "Título", "Equipamento", "Status", "Mão de Obra (R$)", "Itens (R$)", "Desconto (R$)", "Total (R$)", "Motivo Cancelamento"]),
  ];
  for (const o of osList as any[]) {
    const itemsTotal = (o.erp_service_order_items ?? []).reduce(
      (s: number, i: any) => s + (i.quantity ?? 0) * (i.unit_price ?? 0), 0
    );
    const total = itemsTotal + (o.labor_cost ?? 0) - (o.discount ?? 0);
    lines.push(row([
      `NT-${String(o.number).padStart(5, "0")}`,
      new Date(o.created_at).toLocaleDateString("pt-BR"),
      o.erp_customers?.name ?? "",
      o.title ?? "",
      o.equipment ?? "",
      o.status ?? "",
      Number(o.labor_cost ?? 0).toFixed(2),
      itemsTotal.toFixed(2),
      Number(o.discount ?? 0).toFixed(2),
      total.toFixed(2),
      o.cancelled_reason ?? "",
    ]));
  }
  const csv = lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="os-${ano}${mes ? `-${mes.padStart(2,"0")}` : ""}${dia ? `-${dia.padStart(2,"0")}` : ""}.csv"`,
    },
  });
}
