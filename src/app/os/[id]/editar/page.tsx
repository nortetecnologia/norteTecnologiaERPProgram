import { notFound, redirect } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { formatOSNumber } from "@/lib/utils";
import OSForm from "../../nova/OSForm";
import { updateServiceOrder } from "../../actions";

export default async function EditarOSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAuth();

  const supabase = createAdminClient();
  const [{ data: os }, { data: customersRaw }, { data: productsRaw }, { data: employeesRaw }] = await Promise.all([
    supabase
      .from("erp_service_orders")
      .select("*, erp_service_order_items(*)")
      .eq("id", id)
      .single(),
    supabase.from("erp_customers").select("id, name, phone").order("name"),
    supabase.from("products").select("id, name, price, sku, barcode, product_type").eq("is_active", true).order("name"),
    supabase.from("erp_employees").select("id, name").eq("is_active", true).order("name"),
  ]);

  if (!os) notFound();

  const customers = customersRaw ?? [];
  const products = productsRaw ?? [];
  const employees = employeesRaw ?? [];

  const initialData = {
    customer_id: os.customer_id,
    title: os.title,
    description: os.description,
    equipment: os.equipment,
    serial_number: os.serial_number,
    estimated_at: os.estimated_at,
    labor_cost: os.labor_cost ?? 0,
    discount: os.discount ?? 0,
    notes: os.notes,
    issued_by: os.issued_by,
    assigned_to: os.assigned_to,
    images: os.images ?? [],
    items: (os.erp_service_order_items ?? []).map((item: any) => ({
      product_id: item.product_id ?? undefined,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  };

  const action = updateServiceOrder.bind(null, id);

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <div className="text-xs text-gray-500 mb-1">Editando</div>
          <h1 className="text-2xl font-bold text-white">{formatOSNumber(os.number)}</h1>
        </div>
        <OSForm
          customers={customers}
          products={products}
          employees={employees}
          serverAction={action}
          initialData={initialData}
          submitLabel="Salvar alterações"
        />
      </div>
    </AppLayout>
  );
}
