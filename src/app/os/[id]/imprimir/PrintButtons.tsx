"use client";

import { useRouter } from "next/navigation";

export default function PrintButtons({
  osId,
  hideValues,
}: {
  osId: string;
  hideValues: boolean;
}) {
  return (
    <div className="flex gap-2 mb-6 no-print">
      <button
        onClick={() => window.print()}
        className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800"
      >
        🖨 Imprimir
      </button>
      <a
        href={hideValues ? `/os/${osId}/imprimir` : `/os/${osId}/imprimir?sem_valores=1`}
        className="bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-lg hover:bg-gray-200"
      >
        {hideValues ? "Mostrar valores" : "Sem valores (requisição)"}
      </a>
      <a
        href={`/os/${osId}`}
        className="text-gray-500 text-sm px-4 py-2 rounded-lg hover:text-gray-700"
      >
        ← Voltar
      </a>
    </div>
  );
}
