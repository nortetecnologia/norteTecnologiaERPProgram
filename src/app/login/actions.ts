"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { extractRole } from "@/lib/auth";
import { getClientIP, slidingWindow } from "@/lib/rateLimit";

export async function loginAction(formData: FormData) {
  const ip = await getClientIP();
  if (!slidingWindow(`erp_login:${ip}`, 10, 15 * 60_000)) {
    redirect("/login?error=rate_limit");
  }

  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/login?error=invalid");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect("/login?error=invalid");
  }

  // Validate ERP access — sign out immediately if no role
  const role = extractRole(data.user.app_metadata);
  if (!role) {
    await supabase.auth.signOut();
    redirect("/login?error=unauthorized");
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
