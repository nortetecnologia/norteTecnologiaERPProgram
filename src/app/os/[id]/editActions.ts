"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";
import { isOfflineMode, markLocalDataStale } from "@/lib/offline";
import { offlineUpdate } from "@/lib/offline-queue";

export async function updateOSImages(osId: string, images: string[]): Promise<{ error?: string }> {
  await requireAuth();

  if (isOfflineMode()) {
    offlineUpdate("erp_service_orders", osId, { images });
    revalidatePath(`/os/${osId}`);
    markLocalDataStale();
    return {};
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("erp_service_orders")
    .update({ images })
    .eq("id", osId);

  if (error) return { error: error.message };

  revalidatePath(`/os/${osId}`);
  markLocalDataStale();
  return {};
}
