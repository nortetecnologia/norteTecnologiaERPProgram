"use server";

import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractRole } from "@/lib/auth";
import { pkceStore } from "@/lib/pkce-store";

export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) redirect("/esqueci-senha?error=invalid");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) redirect("/esqueci-senha?error=server");

  const user = data.users.find((u) => u.email?.toLowerCase() === email);
  if (!user || !extractRole(user.app_metadata)) {
    redirect("/esqueci-senha?error=not_found");
  }

  // Capture the PKCE code_verifier via custom storage before it's written
  // to browser cookies. We store it server-side so any browser can use it.
  const resetId = crypto.randomUUID();
  let capturedVerifier = "";
  const captureStorage = {
    getItem: () => null as string | null,
    setItem: (_key: string, value: string) => {
      capturedVerifier = value;
    },
    removeItem: () => {},
  };

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      auth: {
        flowType: "pkce",
        storage: captureStorage,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  );

  const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    email,
    { redirectTo: `http://localhost:3721/redefinir-senha?rid=${resetId}` }
  );
  if (resetError) redirect("/esqueci-senha?error=server");

  if (capturedVerifier) pkceStore.set(resetId, capturedVerifier);

  redirect("/esqueci-senha?sent=1");
}
