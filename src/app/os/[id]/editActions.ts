"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function updateOSImages(osId: string, images: string[]): Promise<{ error?: string }> {
  await requireAuth();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("erp_service_orders")
    .update({ images })
    .eq("id", osId);

  if (error) return { error: error.message };

  revalidatePath(`/os/${osId}`);
  return {};
}
