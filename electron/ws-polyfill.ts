// Node 20 (Electron) não tem WebSocket nativo. O @supabase/supabase-js inicializa
// um cliente realtime no construtor e lança "native WebSocket not found".
// Fornecemos o WebSocket do pacote `ws` globalmente antes de qualquer createClient.
import { WebSocket } from "ws";

const g = globalThis as unknown as { WebSocket?: unknown };
if (typeof g.WebSocket === "undefined") {
  g.WebSocket = WebSocket;
}
