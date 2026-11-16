"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg"
    >
      🖨 Imprimir
    </button>
  );
}
