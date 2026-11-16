"use client";

export default function PrintButton({ backHref }: { backHref: string }) {
  return (
    <div className="no-print">
      <button className="btn-print" onClick={() => window.print()}>
        🖨 Imprimir
      </button>
      <a href={backHref} className="btn-secondary">
        ← Voltar
      </a>
    </div>
  );
}
