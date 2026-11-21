"use client";

import { useOSTabs } from "@/lib/os-tabs";
import OSForm from "./OSForm";

interface Customer { id: string; name: string; phone?: string }
interface Product { id: string; name: string; price: number; sku?: string; barcode?: string; product_type: "product" | "service" }
interface Employee { id: string; name: string }

interface Props {
  customers: Customer[];
  products: Product[];
  employees: Employee[];
}

export default function OSTabsView({ customers, products, employees }: Props) {
  const { tabs, activeTabId, setActiveTabId, openNewTab, closeTab } = useOSTabs();

  return (
    <>
      {/* Horizontal tab bar */}
      <div className="flex items-center gap-1 mb-5">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition-colors group ${
              tab.id === activeTabId
                ? "bg-brand-yellow text-brand-black"
                : "bg-brand-gray-mid text-gray-400 hover:text-white"
            }`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span>{tab.label}</span>
            {tabs.length > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                className={`ml-0.5 transition-opacity text-[10px] leading-none hover:text-red-500 ${
                  tab.id === activeTabId ? "text-brand-black/60" : "opacity-0 group-hover:opacity-100"
                }`}
                title="Fechar aba"
              >✕</button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={openNewTab}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-brand-yellow hover:bg-brand-gray-mid transition-colors"
          title="Nova aba de OS"
        >
          <span className="text-sm font-bold">+</span>
        </button>
      </div>

      {/* One OSForm per tab — hidden ones stay mounted (preserves file uploads etc.) */}
      {tabs.map((tab) => (
        <div key={tab.id} className={tab.id === activeTabId ? "" : "hidden"}>
          <OSForm customers={customers} products={products} employees={employees} />
        </div>
      ))}
    </>
  );
}
