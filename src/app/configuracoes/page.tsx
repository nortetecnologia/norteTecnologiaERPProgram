import AppLayout from "@/components/layout/AppLayout";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import ConfigForm from "./ConfigForm";
import { BackupConfig, DumpConfig } from "@/components/desktop/DesktopOnly";
import SyncPanel from "@/components/desktop/SyncPanel";

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Configurações</h1>
          <Link
            href="/configuracoes/usuarios"
            className="text-sm px-4 py-2 bg-brand-gray-dark border border-brand-gray-mid text-gray-300 rounded-lg hover:border-brand-yellow hover:text-white transition-colors"
          >
            Gerenciar usuários →
          </Link>
        </div>
        <ConfigForm settings={settings} paymentMethods={paymentMethods ?? []} />
        <BackupConfig />
        <DumpConfig />
        <SyncPanel />
      </div>
    </AppLayout>
  );
}
