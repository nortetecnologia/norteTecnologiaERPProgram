"use client";

import { useEffect, useState, useCallback } from "react";
import type { SyncStatus } from "@/types/electron";

export default function DesktopBar() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);

  const refresh = useCallback(async () => {
    const s = await window.electronAPI?.getSyncStatus();
    if (s) setStatus(s);
  }, []);

  const refreshOffline = useCallback(async () => {
    const o = await window.electronAPI?.offlineStatus();
    setOffline(o ?? false);
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    refresh();
    refreshOffline();
    const unsub = window.electronAPI.onSyncUpdate((s) => setStatus(s));
    return unsub;
  }, [refresh, refreshOffline]);

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
  };

  const lastSyncLabel = status.lastSync
    ? new Date(status.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "Nunca";

  return (
    <>
      {offline && (
        <div className="flex items-center justify-between px-4 py-1 bg-yellow-500/20 border-b border-yellow-500/40 text-xs text-yellow-300">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            Modo offline ativo — dados locais em uso
          </span>
          <button
            onClick={handleGoOnline}
            className="px-2 py-0.5 rounded bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-200 transition-colors"
          >
            Voltar online
          </button>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-1.5 bg-brand-gray-dark border-b border-white/10 text-xs text-white/70">
        {/* Status: o modo offline manual tem prioridade sobre o estado de conexão */}
        {offline ? (
          <span className="flex items-center gap-1.5 text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            Modo offline
          </span>
        ) : (
          <span className={`flex items-center gap-1.5 ${status.online ? "text-green-400" : "text-red-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.online ? "bg-green-400" : "bg-red-400"}`} />
            {status.online ? "Online" : "Sem conexão"}
          </span>
        )}

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

        {/* Baixar do Supabase (pull) */}
        <button
          onClick={handlePull}
          disabled={syncing || status.syncing || offline}
          title="Baixa os dados mais recentes do Supabase para o banco local"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {syncing || status.syncing ? "Sincronizando..." : "Baixar do Supabase"}
        </button>

        {/* Enviar mudanças (push) */}
        <button
          onClick={handlePush}
          disabled={syncing || status.syncing}
          title="Envia as mudanças feitas localmente para o Supabase"
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded disabled:opacity-50 transition-colors ${
            status.pendingCount > 0 ? "bg-brand-yellow/20 text-brand-yellow hover:bg-brand-yellow/30" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Enviar mudanças{status.pendingCount > 0 ? ` (${status.pendingCount})` : ""}
        </button>

        {/* Pendentes */}
        {status.pendingCount > 0 && (
          <span className="text-yellow-400">
            {status.pendingCount} pendente{status.pendingCount > 1 ? "s" : ""}
          </span>
        )}

        <span className="ml-auto opacity-50">Último sync: {lastSyncLabel}</span>

        {/* Botão entrar em modo offline (ao sair, usa o "Voltar online" do banner) */}
        {!offline && (
          <button
            onClick={handleGoOffline}
            disabled={offlineLoading}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors"
            title="Baixar dados e trabalhar sem internet"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
    </>
  );
}
