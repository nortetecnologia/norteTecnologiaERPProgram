"use client";

import { useState } from "react";
import type { DumpResult, RestoreResult } from "@/types/electron";

type Tab = "export" | "restore";

export default function DumpConfig() {
  const [tab, setTab] = useState<Tab>("export");

  // Export state
  const [destPath, setDestPath] = useState<string | null>(null);
  const [dumping, setDumping] = useState(false);
  const [dumpResult, setDumpResult] = useState<DumpResult | null>(null);

  // Restore state
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!window.electronAPI) return null;

  const handleChoosePath = async () => {
    const p = await window.electronAPI?.dumpChoosePath();
    if (p) { setDestPath(p); setDumpResult(null); }
  };

  const handleDump = async () => {
    if (!destPath) return;
    setDumping(true);
    setDumpResult(null);
    const res = await window.electronAPI?.dumpRun(destPath);
    setDumping(false);
    if (res) setDumpResult(res);
  };

  const handleChooseFile = async () => {
    const f = await window.electronAPI?.dumpChooseFile();
    if (f) { setRestoreFile(f); setRestoreResult(null); setConfirmed(false); }
  };

  const handleRestore = async () => {
    if (!restoreFile || !confirmed) return;
    setRestoring(true);
    setRestoreResult(null);
    const res = await window.electronAPI?.dumpRestore(restoreFile);
    setRestoring(false);
    if (res) setRestoreResult(res);
    setConfirmed(false);
  };

  return (
    <div className="border border-white/10 rounded-lg mt-4 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {(["export", "restore"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-white/5 text-white border-b-2 border-brand-yellow"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {t === "export" ? "Exportar dump" : "Restaurar dump"}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">
        {tab === "export" ? (
          <>
            <div>
              <h3 className="font-semibold text-sm text-white/80">Exportar banco de dados</h3>
              <p className="text-xs text-white/40 mt-1">
                Salva todas as tabelas do Supabase em um arquivo JSON que pode ser reimportado pelo programa.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/50">Pasta de destino</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={destPath ?? "Nenhuma pasta selecionada"}
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

            <button
              onClick={handleDump}
              disabled={dumping || !destPath}
              className="px-4 py-1.5 bg-brand-yellow text-brand-dark rounded text-sm font-medium hover:bg-brand-yellow/90 transition-colors disabled:opacity-50"
            >
              {dumping ? "Exportando..." : "Fazer dump agora"}
            </button>

            {dumpResult && (
              <div className={`text-xs space-y-1 ${dumpResult.success ? "text-green-400" : "text-red-400"}`}>
                {dumpResult.success ? (
                  <>
                    <p>✓ Dump salvo em: {dumpResult.path}</p>
                    <p>{dumpResult.totalRows} registros em {dumpResult.tables?.length} tabelas</p>
                    <p className="text-white/40">{dumpResult.tables?.join(", ")}</p>
                  </>
                ) : (
                  <p>Erro: {dumpResult.error}</p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <h3 className="font-semibold text-sm text-white/80">Restaurar banco de dados</h3>
              <p className="text-xs text-white/40 mt-1">
                Reimporta dados de um arquivo de dump JSON para o Supabase. Registros existentes serão sobrescritos.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-white/50">Arquivo de dump (.json)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={restoreFile ?? "Nenhum arquivo selecionado"}
                  className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white/70"
                />
                <button
                  onClick={handleChooseFile}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded text-sm transition-colors"
                >
                  Escolher
                </button>
              </div>
            </div>

            {restoreFile && (
              <label className="flex items-center gap-2 text-xs text-yellow-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="accent-brand-yellow"
                />
                Entendo que os dados existentes no Supabase serão sobrescritos
              </label>
            )}

            <button
              onClick={handleRestore}
              disabled={restoring || !restoreFile || !confirmed}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
            >
              {restoring ? "Restaurando..." : "Restaurar agora"}
            </button>

            {restoring && (
              <p className="text-xs text-white/50 animate-pulse">
                Importando dados em lotes — pode levar alguns minutos dependendo do volume...
              </p>
            )}

            {restoreResult && (
              <div className={`text-xs space-y-1 ${restoreResult.success ? "text-green-400" : "text-red-400"}`}>
                {restoreResult.success ? (
                  <>
                    <p>✓ Restauração concluída: {restoreResult.totalRows} registros em {restoreResult.tables?.length} tabelas</p>
                    <p className="text-white/40">{restoreResult.tables?.join(", ")}</p>
                  </>
                ) : (
                  <p>Erro: {restoreResult.error}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
