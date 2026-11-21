"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface OSTab {
  id: string;
  label: string;
}

interface OSTabsCtx {
  tabs: OSTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  openNewTab: () => void;
  closeTab: (id: string) => void;
}

const Ctx = createContext<OSTabsCtx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

const DEFAULT_ID = "os-default";

export function OSTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<OSTab[]>([{ id: DEFAULT_ID, label: "Nova OS 1" }]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_ID);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem("os_tabs_v1");
      if (raw) {
        const d = JSON.parse(raw);
        if (Array.isArray(d.tabs) && d.tabs.length > 0) {
          setTabs(d.tabs);
          setActiveTabId(d.activeTabId ?? d.tabs[0].id);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem("os_tabs_v1", JSON.stringify({ tabs, activeTabId }));
    } catch {}
  }, [tabs, activeTabId]);

  const openNewTab = useCallback(() => {
    setTabs((prev) => {
      const newTab: OSTab = { id: uid(), label: `Nova OS ${prev.length + 1}` };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((t) => t.id !== id);
      setActiveTabId((cur) => {
        if (cur !== id) return cur;
        return next[next.length - 1].id;
      });
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ tabs, activeTabId, setActiveTabId, openNewTab, closeTab }}>
      {children}
    </Ctx.Provider>
  );
}

export function useOSTabs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOSTabs must be inside OSTabsProvider");
  return ctx;
}
