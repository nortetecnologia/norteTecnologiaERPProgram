"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { pkceStore } from "@/lib/pkce-store";

export async function updatePasswordAction(formData: FormData) {
  const code = (formData.get("code") as string)?.trim();
  const rid = (formData.get("rid") as string)?.trim();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm_password") as string;

  if (!code || !rid) redirect("/esqueci-senha?error=invalid");

  // Validate password BEFORE consuming the code
  if (!password || password.length < 6) {
    redirect(
      `/redefinir-senha?code=${encodeURIComponent(code)}&rid=${rid}&error=weak`
    );
  }
  if (password !== confirm) {
    redirect(
      `/redefinir-senha?code=${encodeURIComponent(code)}&rid=${rid}&error=mismatch`
    );
  }

  const verifier = pkceStore.get(rid);
  if (!verifier) redirect("/esqueci-senha?error=expired");

  // Provide the verifier to the PKCE storage so exchangeCodeForSession works
  // regardless of which browser opened the email link.
  const pkceStorage = {
    getItem: (key: string) =>
      key.endsWith("-code-verifier") ? verifier : (null as string | null),
    setItem: () => {},
    removeItem: () => {},
  };

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: {
        flowType: "pkce",
        storage: pkceStorage,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    pkceStore.delete(rid);
    redirect("/esqueci-senha?error=expired");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) redirect("/login?reset=error");

  await supabase.auth.signOut();
  pkceStore.delete(rid);
  redirect("/login?reset=done");
}
