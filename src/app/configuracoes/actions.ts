"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

export async function saveSettings(prevState: unknown, formData: FormData) {
  await requireAdmin();
  const supabase = createAdminClient();

  // --- store_settings ---
  const storePayload = {
    store_name: (formData.get("store_name") as string)?.trim() || "Norte Tecnologia",
    whatsapp_number: (formData.get("whatsapp_number") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    address: (formData.get("address") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    state_abbr: (formData.get("state_abbr") as string)?.trim().toUpperCase() || null,
    updated_at: new Date().toISOString(),
  };

  // --- payment_methods table ---
  const names = formData.getAll("pm_name").map(String).filter(Boolean);
  const labels = formData.getAll("pm_label").map(String).filter(Boolean);

  if (names.length === 0) {
    return { error: "É necessário ao menos uma forma de pagamento." };
  }

  // Monta lista de métodos ativos com posição
  const activeMethods = names.map((name, i) => ({
    name,
    label: labels[i] ?? name,
    is_active: true,
    position: i,
  }));

  // Upsert métodos ativos
  const { error: upsertError } = await supabase
    .from("payment_methods")
    .upsert(activeMethods, { onConflict: "name" });

  if (upsertError) return { error: upsertError.message };

  // Marcar como inativo qualquer método não presente na lista
  const { error: deactivateError } = await supabase
    .from("payment_methods")
    .update({ is_active: false })
    .not("name", "in", `(${names.map((n) => `"${n}"`).join(",")})`);

  if (deactivateError) return { error: deactivateError.message };

  // Sincronizar labels com store_settings.payment_methods (compatibilidade com o site)
  const syncPayload = { ...storePayload, payment_methods: activeMethods.map((m) => m.label) };

  const { data: existing } = await supabase.from("store_settings").select("id").single();

  if (existing) {
    const { error } = await supabase.from("store_settings").update(syncPayload).eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("store_settings").insert(syncPayload);
    if (error) return { error: error.message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/pdv");
  return { success: true };
}
