"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncStatus } from "@/types/electron";

export default function SyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(async () => {
    const s = await window.electronAPI?.getSyncStatus();
    if (s) setStatus(s);
  }, []);

  const refreshOffline = useCallback(async () => {
    const o = await window.electronAPI?.offlineStatus();
    setOffline(o ?? false);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!window.electronAPI) return;
    refresh();
    refreshOffline();
    const unsub = window.electronAPI.onSyncUpdate((s) => setStatus(s));
    return unsub;
  }, [refresh, refreshOffline]);

  if (!mounted || !window.electronAPI) return null;

  const handleToggle = async () => {
    if (!status) return;
    await window.electronAPI?.toggleSync(!status.enabled);
    refresh();
  };

  const handlePull = async () => {
    setSyncing(true);
    const r = await window.electronAPI?.syncPull();
    setSyncing(false);
    refresh();
    if (r && !r.success) alert(`Erro ao baixar do Supabase: ${r.error ?? "desconhecido"}`);
  };

  const handlePush = async () => {
    setSyncing(true);
    const r = await window.electronAPI?.syncPush();
    setSyncing(false);
    refresh();
    if (r && !r.success) {
      alert(`Erro ao enviar mudanças: ${r.error ?? "desconhecido"}`);
    } else if (r && r.remaining && r.remaining > 0) {
      alert(`${r.remaining} mudança(s) ainda pendente(s) — tente novamente.`);
    }
  };

  const handleGoOffline = async () => {
    setOfflineLoading(true);
    const result = await window.electronAPI?.offlineGo();
    setOfflineLoading(false);
    if (result?.success) {
      setOffline(true);
    } else {
      alert(`Erro ao entrar em modo offline: ${result?.error ?? "desconhecido"}`);
    }
  };

  const handleGoOnline = async () => {
    await window.electronAPI?.offlineBack();
    setOffline(false);
    refresh();
  };

  const lastSyncLabel = status?.lastSync
    ? new Date(status.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "Nunca";

  return (
    <div className="bg-brand-gray-dark border border-brand-gray-mid rounded-xl p-5 mt-6">
      <h2 className="text-sm font-semibold text-gray-300 mb-4">Sincronização de Rede</h2>

      {/* Status */}
      <div className="flex items-center gap-3 mb-4">
        {offline ? (
          <span className="flex items-center gap-2 text-sm text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            Modo offline
          </span>
        ) : (
          <span className={`flex items-center gap-2 text-sm ${status?.online ? "text-green-400" : "text-red-400"}`}>
            <span className={`w-2 h-2 rounded-full ${status?.online ? "bg-green-400" : "bg-red-400"}`} />
            {status?.online ? "Online" : "Sem conexão"}
          </span>
        )}
        <span className="text-xs text-gray-500 ml-auto">Último sync: {lastSyncLabel}</span>
        {status && status.pendingCount > 0 && (
          <span className="text-xs text-yellow-400 font-medium">
            {status.pendingCount} pendente{status.pendingCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {/* Toggle sync on/off */}
        <button
          onClick={handleToggle}
          disabled={!status}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
            status?.enabled
              ? "bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/40"
              : "bg-brand-gray-mid text-gray-400 border border-brand-gray-light hover:text-white"
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Sync {status?.enabled ? "ligado" : "desligado"}
        </button>

        {/* Baixar do Supabase */}
        <button
          onClick={handlePull}
          disabled={syncing || !!status?.syncing || offline}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-brand-gray-mid text-gray-300 border border-brand-gray-light hover:border-brand-yellow/50 hover:text-white disabled:opacity-50 transition-colors"
          title="Baixa os dados mais recentes do Supabase para o banco local"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {syncing || status?.syncing ? "Sincronizando..." : "Baixar do Supabase"}
        </button>

        {/* Enviar mudanças */}
        <button
          onClick={handlePush}
          disabled={syncing || !!status?.syncing}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border disabled:opacity-50 transition-colors ${
            status && status.pendingCount > 0
              ? "bg-brand-yellow/20 text-brand-yellow border-brand-yellow/40 hover:bg-brand-yellow/30"
              : "bg-brand-gray-mid text-gray-300 border-brand-gray-light hover:border-brand-yellow/50 hover:text-white"
          }`}
          title="Envia as mudanças feitas localmente para o Supabase"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Enviar mudanças{status && status.pendingCount > 0 ? ` (${status.pendingCount})` : ""}
        </button>

        {/* Modo offline */}
        {offline ? (
          <button
            onClick={handleGoOnline}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 hover:bg-yellow-500/30 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            Voltar online
          </button>
        ) : (
          <button
            onClick={handleGoOffline}
            disabled={offlineLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-brand-gray-mid text-gray-300 border border-brand-gray-light hover:border-brand-yellow/50 hover:text-white disabled:opacity-50 transition-colors"
            title="Baixar dados e trabalhar sem internet"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            {offlineLoading ? "Baixando dados..." : "Ir offline"}
          </button>
        )}
      </div>
    </div>
  );
}
