import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { FuncionariosClient, type EmployeeData, type RoleData } from "./FuncionariosClient";

export default async function FuncionariosPage() {
  await requireAuth();
  const supabase = createAdminClient();

  const [{ data: rawEmployees }, { data: rawRoles }] = await Promise.all([
    supabase
      .from("erp_employees")
      .select("id, name, phone, email, notes, is_active, erp_employee_roles(role_id, erp_roles(id, name, description, is_active))")
      .order("name"),
    supabase
      .from("erp_roles")
      .select("id, name, description, is_active")
      .order("name"),
  ]);

  const roles: RoleData[] = (rawRoles ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    is_active: r.is_active ?? true,
  }));

  const employees: EmployeeData[] = (rawEmployees ?? []).map((e: any) => ({
    id: e.id,
    name: e.name,
    phone: e.phone ?? null,
    email: e.email ?? null,
    notes: e.notes ?? null,
    is_active: e.is_active ?? true,
    roles: (e.erp_employee_roles ?? [])
      .filter((er: any) => er.erp_roles)
      .map((er: any) => ({
        id: er.erp_roles.id,
        name: er.erp_roles.name,
        description: er.erp_roles.description ?? null,
        is_active: er.erp_roles.is_active ?? true,
      })),
  }));

  return (
    <AppLayout>
      <FuncionariosClient employees={employees} roles={roles} />
    </AppLayout>
  );
}
