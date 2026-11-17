import Link from "next/link";
import { requestPasswordResetAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Informe um e-mail válido.",
  not_found: "Nenhum usuário com este e-mail tem acesso ao sistema.",
  server: "Erro ao processar a solicitação. Tente novamente.",
};

export default async function EsqueciSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

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

          {sent === "1" ? (
            /* ── Sucesso ── */
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-white text-lg font-semibold mb-2">E-mail enviado</h2>
              <p className="text-gray-400 text-sm mb-6">
                Verifique sua caixa de entrada e clique no link de recuperação.
                O link expira em <span className="text-white">1 hora</span>.
              </p>
              <Link
                href="/login"
                className="text-brand-yellow text-sm hover:underline"
              >
                ← Voltar para o login
              </Link>
            </div>
          ) : (
            /* ── Formulário ── */
            <>
              <h1 className="text-white text-xl font-semibold text-center mb-1">
                Recuperar senha
              </h1>
              <p className="text-[#6b7280] text-sm text-center mb-8">
                Informe o e-mail da sua conta para receber o link de redefinição.
              </p>

              {error && (
                <div className="mb-5 p-3 rounded-lg text-sm border bg-red-500/10 border-red-500/30 text-red-400">
                  {ERROR_MESSAGES[error] ?? "Ocorreu um erro. Tente novamente."}
                </div>
              )}

              <form action={requestPasswordResetAction} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#d1d5db] mb-1.5">
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-semibold py-3 rounded-lg transition-colors text-sm"
                >
                  Enviar link de recuperação
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link href="/login" className="text-[#4b5563] text-sm hover:text-gray-400 transition-colors">
                  ← Voltar para o login
                </Link>
              </div>
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
