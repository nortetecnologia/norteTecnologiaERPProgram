"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export interface PDVTab {
  id: string;
  label: string;
}

interface PDVTabsCtx {
  tabs: PDVTab[];
  activeTabId: string;
  setActiveTabId: (id: string) => void;
  openNewTab: () => void;
  closeTab: (id: string) => void;
}

const Ctx = createContext<PDVTabsCtx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

const DEFAULT_ID = "pdv-default";

export function PDVTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<PDVTab[]>([{ id: DEFAULT_ID, label: "Venda 1" }]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_ID);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem("pdv_tabs_v2");
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
      localStorage.setItem("pdv_tabs_v2", JSON.stringify({ tabs, activeTabId }));
    } catch {}
  }, [tabs, activeTabId]);

  const openNewTab = useCallback(() => {
    setTabs((prev) => {
      const newTab: PDVTab = { id: uid(), label: `Venda ${prev.length + 1}` };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev; // keep at least one tab
      const next = prev.filter((t) => t.id !== id);
      setActiveTabId((cur) => {
        if (cur !== id) return cur;
        return next[next.length - 1].id;
      });
      try { localStorage.removeItem(`pdv_draft_${id}`); } catch {}
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ tabs, activeTabId, setActiveTabId, openNewTab, closeTab }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePDVTabs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePDVTabs must be inside PDVTabsProvider");
  return ctx;
}
