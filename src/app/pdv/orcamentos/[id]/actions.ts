"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth";

export async function deleteQuoteAction(formData: FormData) {
  await requireAuth();
  const id = formData.get("id") as string;
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("erp_pdv_sales").delete().eq("id", id).eq("type", "quote");

  revalidatePath("/pdv/orcamentos");
  redirect("/pdv/orcamentos");
}
