"use client";

import { useEffect, useState, useCallback } from "react";

export default function DesktopBar() {
  const [offline, setOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refreshOffline = useCallback(async () => {
    const o = await window.electronAPI?.offlineStatus();
    setOffline(o ?? false);
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!window.electronAPI) return;
    refreshOffline();
    // Poll offline status so the banner reacts when the user goes online/offline from Settings
    const interval = setInterval(refreshOffline, 10000);
    return () => clearInterval(interval);
  }, [refreshOffline]);

  const handleGoOnline = async () => {
    await window.electronAPI?.offlineBack();
    setOffline(false);
  };

  if (!mounted || !offline) return null;

  return (
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
  );
}
