"use client";

import { useEffect, useState } from "react";

interface BackupConfig {
  enabled: boolean;
  intervalHours: number;
  path: string;
  keepLast: number;
}

export default function BackupConfig() {
  const [config, setConfig] = useState<BackupConfig>({
    enabled: false,
    intervalHours: 24,
    path: "",
    keepLast: 7,
  });
  const [saved, setSaved] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getBackupConfig().then(setConfig);
  }, []);

  if (!window.electronAPI) return null;

  const handleSave = async () => {
    await window.electronAPI?.setBackupConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChoosePath = async () => {
    const p = await window.electronAPI?.chooseBackupPath();
    if (p) setConfig((c) => ({ ...c, path: p }));
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    setLastResult(null);
    const result = await window.electronAPI?.backupNow();
    setBackingUp(false);
    setLastResult(result?.success ? `Backup salvo em: ${result.path}` : `Erro: ${result?.error}`);
  };

  return (
    <div className="border border-white/10 rounded-lg p-5 space-y-4">
      <h3 className="font-semibold text-sm text-white/80">Backup automático do banco de dados</h3>

      {/* Toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
          className={`relative w-10 h-5 rounded-full transition-colors ${config.enabled ? "bg-brand-yellow" : "bg-white/20"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${config.enabled ? "translate-x-5" : ""}`}
          />
        </div>
        <span className="text-sm">{config.enabled ? "Ativado" : "Desativado"}</span>
      </label>

      {config.enabled && (
        <>
          {/* Pasta */}
          <div className="space-y-1">
            <label className="text-xs text-white/50">Pasta de destino</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={config.path || "Nenhuma pasta selecionada"}
                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white/70"
              />
              <button
                onClick={handleChoosePath}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
              >
                Escolher
              </button>
            </div>
          </div>

          {/* Intervalo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-white/50">Intervalo (horas)</label>
              <select
                value={config.intervalHours}
                onChange={(e) => setConfig((c) => ({ ...c, intervalHours: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm"
              >
                <option value={6}>A cada 6h</option>
                <option value={12}>A cada 12h</option>
                <option value={24}>Diariamente (24h)</option>
                <option value={48}>A cada 2 dias</option>
                <option value={168}>Semanalmente</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/50">Manter últimos</label>
              <select
                value={config.keepLast}
                onChange={(e) => setConfig((c) => ({ ...c, keepLast: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm"
              >
                <option value={3}>3 backups</option>
                <option value={7}>7 backups</option>
                <option value={14}>14 backups</option>
                <option value={30}>30 backups</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Ações */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-brand-yellow text-brand-dark rounded text-sm font-medium hover:bg-brand-yellow/90 transition-colors"
        >
          {saved ? "Salvo!" : "Salvar configurações"}
        </button>

        <button
          onClick={handleBackupNow}
          disabled={backingUp || !config.path}
          className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors disabled:opacity-50"
        >
          {backingUp ? "Fazendo backup..." : "Fazer backup agora"}
        </button>
      </div>

      {lastResult && (
        <p className={`text-xs ${lastResult.startsWith("Erro") ? "text-red-400" : "text-green-400"}`}>
          {lastResult}
        </p>
      )}
    </div>
  );
}
