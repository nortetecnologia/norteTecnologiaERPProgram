import { cache } from "react";
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
 * Uses getSession() (cookie-only, no network) since middleware already verified the JWT.
 * Wrapped in React cache() so multiple calls within the same request are deduplicated.
 */
export const requireAuth = cache(async (): Promise<{ userId: string; role: ERPRole }> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const role = extractRole(session.user.app_metadata);
  if (!role) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  return { userId: session.user.id, role };
});

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
