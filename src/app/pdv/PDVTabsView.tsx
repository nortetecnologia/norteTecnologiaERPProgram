"use client";

import { usePDVTabs } from "@/lib/pdv-tabs";
import PDVClient from "./PDVClient";

interface Product { id: string; name: string; price: number; sku?: string; barcode?: string; stock?: number; product_images?: { url: string; is_primary: boolean }[] | null }
interface Customer { id: string; name: string; phone?: string }
interface PaymentMethodOption { name: string; label: string }
interface Employee { id: string; name: string }

interface Props {
  products: Product[];
  customers: Customer[];
  paymentMethods: PaymentMethodOption[];
  employees: Employee[];
}

export default function PDVTabsView({ products, customers, paymentMethods, employees }: Props) {
  const { tabs, activeTabId, setActiveTabId, openNewTab, closeTab } = usePDVTabs();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Horizontal tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[#111111] border-b border-brand-gray-mid overflow-x-auto shrink-0">
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
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-brand-yellow hover:bg-brand-gray-mid transition-colors whitespace-nowrap"
          title="Nova aba de venda"
        >
          <span className="text-sm font-bold">+</span>
        </button>
      </div>

      {/* Tab content — show/hide keeps React state alive for all tabs */}
      <div className="flex-1 overflow-hidden relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${tab.id === activeTabId ? "flex" : "hidden"}`}
          >
            <PDVClient
              tabId={tab.id}
              products={products}
              customers={customers}
              paymentMethods={paymentMethods}
              employees={employees}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
