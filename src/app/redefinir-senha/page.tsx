import Link from "next/link";
import { updatePasswordAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  weak: "A senha deve ter pelo menos 6 caracteres.",
  mismatch: "As senhas não coincidem.",
  expired: "O link expirou ou já foi usado. Solicite um novo.",
  server: "Erro ao redefinir senha. Tente novamente.",
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error } = await searchParams;

  const inputCls =
    "w-full bg-brand-black border border-brand-gray-mid rounded-lg px-4 py-3 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-colors";

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-brand-gray-dark rounded-xl border border-brand-gray-mid p-8">
          <div className="flex justify-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Norte Tecnologia" className="h-20 w-auto object-contain" />
          </div>

          {!code ? (
            /* ── Link inválido ── */
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-white text-lg font-semibold mb-2">Link inválido</h2>
              <p className="text-gray-400 text-sm mb-6">
                Este link de recuperação é inválido ou já foi utilizado.
              </p>
              <Link href="/esqueci-senha" className="text-brand-yellow text-sm hover:underline">
                Solicitar novo link
              </Link>
            </div>
          ) : (
            /* ── Formulário nova senha ── */
            <>
              <h1 className="text-white text-xl font-semibold text-center mb-1">
                Nova senha
              </h1>
              <p className="text-[#6b7280] text-sm text-center mb-8">
                Escolha uma nova senha para sua conta.
              </p>

              {error && (
                <div className="mb-5 p-3 rounded-lg text-sm border bg-red-500/10 border-red-500/30 text-red-400">
                  {ERROR_MESSAGES[error] ?? "Ocorreu um erro. Tente novamente."}
                </div>
              )}

              <form action={updatePasswordAction} className="space-y-5">
                <input type="hidden" name="code" value={code} />

                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1.5">
                    Nova senha
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1.5">
                    Confirmar nova senha
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-semibold py-3 rounded-lg transition-colors text-sm"
                >
                  Redefinir senha
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-[#4b5563] text-xs mt-6">
          Norte Tecnologia — Sistema de Gestão (ERP)
        </p>
      </div>
    </div>
  );
}
