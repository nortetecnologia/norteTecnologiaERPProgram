import AppLayout from "@/components/layout/AppLayout";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import ConfigForm from "./ConfigForm";
import { BackupConfig } from "@/components/desktop/DesktopOnly";

export default async function ConfiguracoesPage() {
  await requireAdmin();

  const supabase = createAdminClient();
  const [{ data: settings }, { data: paymentMethods }] = await Promise.all([
    supabase.from("store_settings").select("*").single(),
    supabase.from("payment_methods").select("id, name, label, is_active, position").order("position"),
  ]);

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Configurações</h1>
        <ConfigForm settings={settings} paymentMethods={paymentMethods ?? []} />
        <BackupConfig />
      </div>
    </AppLayout>
  );
}
