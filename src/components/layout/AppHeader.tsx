"use client";

import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

interface AppHeaderProps {
  onMenuToggle?: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  return (
    <header className="h-14 bg-[#111111] border-b border-brand-gray-mid flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="text-[#6b7280] hover:text-white transition-colors p-1 rounded md:hidden"
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[#4b5563] text-xs">Sistema de Gestão</span>
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <span className="text-[10px] text-gray-600 bg-[#1a1a1a] border border-brand-gray-mid px-1.5 py-0.5 rounded font-mono">
              v{process.env.NEXT_PUBLIC_APP_VERSION}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/busca"
          className="flex items-center gap-1.5 text-[#6b7280] hover:text-white text-xs transition-colors px-2 py-1.5 rounded hover:bg-brand-gray-dark"
          title="Busca universal (clientes, OS, produtos)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden sm:inline">Buscar</span>
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-[#6b7280] hover:text-white text-xs transition-colors px-2 py-1.5 rounded hover:bg-brand-gray-dark"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
