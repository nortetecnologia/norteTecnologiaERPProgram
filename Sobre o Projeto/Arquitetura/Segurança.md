# Segurança — Norte Tecnologia ERP

## Princípios

- **Autenticação obrigatória:** middleware + verificação in-action em toda operação sensível
- **Negação por padrão:** sem acesso público a nenhuma tabela `erp_*`
- **Privilégio mínimo:** `service_role` apenas em Server Actions que precisam contornar RLS
- **Validação no servidor:** toda validação de formulário ocorre em Server Actions

---

## Autenticação e Roles

- Supabase Auth via e-mail e senha
- Sem cadastro público — usuários criados manualmente no Supabase
- Middleware Next.js protege todas as rotas exceto `/login`, `/esqueci-senha`, `/redefinir-senha` e arquivos estáticos
- Verificação in-action adicional como defesa em profundidade (`requireAuth()` e `requireAdmin()` em `src/lib/auth.ts`)
- **Roles:** `admin` | `operador` armazenados em `app_metadata.erp_role` (lidos do JWT, sem query adicional)
- Usuários sem `erp_role` definido são tratados como `operador` por padrão

## Reset de Senha

Fluxo via Supabase Auth PKCE:

1. `/esqueci-senha` — usuário informa e-mail; Server Action verifica com `admin.auth.admin.listUsers()` se o e-mail existe **e** tem `erp_role` definido; em caso positivo, chama `resetPasswordForEmail(email, { redirectTo: "http://localhost:3721/redefinir-senha" })`.
2. Supabase envia e-mail com link. O link abre no navegador padrão do sistema → `http://localhost:3721/redefinir-senha?code=XXXX`.
3. `/redefinir-senha` — Server Action valida os campos (mínimo 6 caracteres, confirmação) **antes** de consumir o `code`; depois chama `exchangeCodeForSession(code)` → `updateUser({ password })` → `signOut()` → redireciona para `/login?reset=done`.
4. E-mails falsos ou sem `erp_role` recebem `error=not_found` — sem enumeração de usuários (mensagem genérica).

**Configuração obrigatória no Supabase:**
- Authentication → URL Configuration → Site URL: `http://localhost:3721`
- Authentication → URL Configuration → Redirect URLs: `http://localhost:3721/**`

---

## Rate Limiting

| Endpoint | Limite |
|----------|--------|
| Login | 10 tentativas / 15 min por IP |
| Criação de OS | 60 / hora por IP |
| Criação de venda PDV | 300 / hora por IP |

Implementação: sliding window em memória (`src/lib/rateLimit.ts`).

> **Limitação:** rate limiting por instância Vercel. Para escalar com múltiplas instâncias, substituir por Upstash Redis.

## Banco de Dados

- RLS habilitado em todas as tabelas `erp_*`
- Acesso permitido apenas para `auth.role() = 'authenticated'`
- `SUPABASE_SECRET_KEY` nunca exposto ao frontend
- `createAdminClient()` apenas em Server Actions autenticadas

## Upload de Imagens

- Mesmo padrão do site: assinatura SHA-1, `CLOUDINARY_API_SECRET` apenas no servidor
- Validação de magic bytes (JPEG/PNG/WebP/GIF)
- Tamanho máximo: 10 MB

## Headers HTTP

Mesmos headers do site:
- Content-Security-Policy
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- Referrer-Policy
- Permissions-Policy
