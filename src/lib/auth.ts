import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { redirect } from "next/navigation";

export type ERPRole = "admin" | "operador";

/** Reads the ERP role from Supabase app_metadata. Any authenticated user defaults to "operador". */
export function extractRole(appMetadata: Record<string, unknown> | null | undefined): ERPRole | null {
  const role = appMetadata?.erp_role;
  if (role === "admin") return "admin";
  if (role === "operador" || role === undefined || role === null) return "operador";
  return null;
}

/**
 * Fetches the current user and their ERP role.
 * Throws redirect to /login if not authenticated or no ERP access.
 */
export async function requireAuth(): Promise<{ userId: string; role: ERPRole }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = extractRole(user.app_metadata);
  if (!role) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  return { userId: user.id, role };
}

/** Like requireAuth but also demands admin role. */
export async function requireAdmin(): Promise<{ userId: string; role: "admin" }> {
  const { userId, role } = await requireAuth();
  if (role !== "admin") redirect("/login?error=forbidden");
  return { userId, role: "admin" };
}

/**
 * Grants or revokes ERP access for a user via Supabase admin API.
 * Only called from server actions guarded by requireAdmin().
 */
export async function setUserERPRole(userId: string, role: ERPRole | null) {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { erp_role: role ?? null },
  });
  if (error) throw new Error(error.message);
}
