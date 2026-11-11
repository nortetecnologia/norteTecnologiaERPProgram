"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncStatus } from "@/types/electron";


export default function DesktopBar() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const s = await window.electronAPI?.getSyncStatus();
    if (s) setStatus(s);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    refresh();
    const unsub = window.electronAPI.onSyncUpdate((s) => setStatus(s));
    return unsub;
  }, [refresh]);

  if (!window.electronAPI || !status) return null;

  const handleToggle = async () => {
    await window.electronAPI?.toggleSync(!status.enabled);
    refresh();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await window.electronAPI?.syncNow();
    setSyncing(false);
    refresh();
  };

  const lastSyncLabel = status.lastSync
    ? new Date(status.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "Nunca";

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-brand-gray-dark border-b border-white/10 text-xs text-white/70">
      {/* Status de conexão */}
      <span className={`flex items-center gap-1.5 ${status.online ? "text-green-400" : "text-yellow-400"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.online ? "bg-green-400" : "bg-yellow-400"}`} />
        {status.online ? "Online" : "Offline"}
      </span>

      {/* Toggle sync */}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors ${
          status.enabled
            ? "bg-brand-yellow/20 text-brand-yellow"
            : "bg-white/10 text-white/50 hover:bg-white/20"
        }`}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        Sync {status.enabled ? "ligado" : "desligado"}
      </button>

      {/* Botão sincronizar agora */}
      {status.enabled && (
        <button
          onClick={handleSyncNow}
          disabled={syncing || status.syncing}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          <svg
            className={`w-3 h-3 ${syncing || status.syncing ? "animate-spin" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {syncing || status.syncing ? "Sincronizando..." : "Sincronizar agora"}
        </button>
      )}

      {/* Pendentes */}
      {status.pendingCount > 0 && (
        <span className="text-yellow-400">
          {status.pendingCount} pendente{status.pendingCount > 1 ? "s" : ""}
        </span>
      )}

      <span className="ml-auto opacity-50">Último sync: {lastSyncLabel}</span>
    </div>
  );
}
