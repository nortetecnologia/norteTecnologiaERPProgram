import { loginAction } from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "E-mail ou senha incorretos.",
  rate_limit: "Muitas tentativas. Aguarde 15 minutos.",
  unauthorized: "Sem acesso ao ERP. Contate o administrador.",
  forbidden: "Sem permissão para esta ação.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-brand-gray-dark rounded-xl border border-brand-gray-mid p-8">
          <div className="flex justify-center mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Norte Tecnologia"
              className="h-20 w-auto object-contain"
            />
          </div>

          <h1 className="text-white text-xl font-semibold text-center mb-1">
            Sistema de Gestão
          </h1>
          <p className="text-[#6b7280] text-sm text-center mb-8">
            Entre com suas credenciais para continuar
          </p>

          <ErrorBanner searchParams={searchParams} />

          <form action={loginAction} className="space-y-5">
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
                className="w-full bg-brand-black border border-brand-gray-mid rounded-lg px-4 py-3 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#d1d5db] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-brand-black border border-brand-gray-mid rounded-lg px-4 py-3 text-white text-sm placeholder-[#4b5563] focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-semibold py-3 rounded-lg transition-colors text-sm mt-2"
            >
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-[#4b5563] text-xs mt-6">
          Norte Tecnologia — Sistema de Gestão (ERP)
        </p>
      </div>
    </div>
  );
}

async function ErrorBanner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;

  const message = ERROR_MESSAGES[error] ?? "Ocorreu um erro. Tente novamente.";
  const isUnauthorized = error === "unauthorized" || error === "forbidden";

  return (
    <div
      className={`mb-5 p-3 rounded-lg text-sm border ${
        isUnauthorized
          ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
          : "bg-red-500/10 border-red-500/30 text-red-400"
      }`}
    >
      {message}
    </div>
  );
}
