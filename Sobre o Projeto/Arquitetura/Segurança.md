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
- Middleware Next.js protege todas as rotas exceto `/login` e arquivos estáticos
- Verificação in-action adicional como defesa em profundidade (`requireAuth()` e `requireAdmin()` em `src/lib/auth.ts`)
- **Roles:** `admin` | `operador` armazenados em `app_metadata.erp_role` (lidos do JWT, sem query adicional)
- Usuários sem `erp_role` definido são tratados como `operador` por padrão

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
