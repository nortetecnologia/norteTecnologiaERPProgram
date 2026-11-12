"use client";

export default function PrintButtons({
  osId,
  hideValues,
}: {
  osId: string;
  hideValues: boolean;
}) {
  return (
    <div className="no-print">
      <button className="btn-print" onClick={() => window.print()}>
        🖨 Imprimir
      </button>
      <a
        href={hideValues ? `/os/${osId}/imprimir` : `/os/${osId}/imprimir?sem_valores=1`}
        className="btn-secondary"
      >
        {hideValues ? "Mostrar valores" : "Sem valores (requisição)"}
      </a>
      <a href={`/os/${osId}`} className="btn-secondary">
        ← Voltar
      </a>
    </div>
  );
}
