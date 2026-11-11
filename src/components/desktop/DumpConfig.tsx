"use client";

import { useState } from "react";
import type { DumpResult } from "@/types/electron";

export default function DumpConfig() {
  const [destPath, setDestPath] = useState<string | null>(null);
  const [dumping, setDumping] = useState(false);
  const [result, setResult] = useState<DumpResult | null>(null);

  if (!window.electronAPI) return null;

  const handleChoosePath = async () => {
    const p = await window.electronAPI?.dumpChoosePath();
    if (p) {
      setDestPath(p);
      setResult(null);
    }
  };

  const handleDump = async () => {
    if (!destPath) return;
    setDumping(true);
    setResult(null);
    const res = await window.electronAPI?.dumpRun(destPath);
    setDumping(false);
    if (res) setResult(res);
  };

  return (
    <div className="border border-white/10 rounded-lg p-5 space-y-4 mt-4">
      <div>
        <h3 className="font-semibold text-sm text-white/80">Dump completo do Supabase</h3>
        <p className="text-xs text-white/40 mt-1">Exporta todas as tabelas do banco de dados para um arquivo JSON.</p>
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

      {result && (
        <div className={`text-xs space-y-1 ${result.success ? "text-green-400" : "text-red-400"}`}>
          {result.success ? (
            <>
              <p>Dump salvo em: {result.path}</p>
              <p>{result.totalRows} registros em {result.tables?.length} tabelas: {result.tables?.join(", ")}</p>
            </>
          ) : (
            <p>Erro: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
