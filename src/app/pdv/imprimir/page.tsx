import { Suspense } from "react";
import PrintTempContent from "./PrintTempContent";

export default function PDVImprimirPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "40px", fontFamily: "sans-serif", textAlign: "center", color: "#666" }}>
        Carregando...
      </div>
    }>
      <PrintTempContent />
    </Suspense>
  );
}
