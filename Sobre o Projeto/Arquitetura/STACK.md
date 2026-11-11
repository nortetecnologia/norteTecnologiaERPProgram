# Stack Tecnológica — Norte Tecnologia ERP

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 15.x |
| Linguagem | TypeScript | 5.x |
| Estilo | Tailwind CSS | 3.x |
| Banco de Dados | Supabase (PostgreSQL) | compartilhado com o site |
| Auth | Supabase Auth | compartilhado com o site |
| Imagens | Cloudinary | compartilhado com o site |
| Hospedagem | Vercel | serverless |

## Decisões arquiteturais

- **Banco compartilhado:** mesmo projeto Supabase do site. Tabelas ERP têm prefixo `erp_`.
- **Mesmo Auth:** usuários admin do site têm acesso ao ERP. Sem cadastro público.
- **Server Actions:** todas as mutações passam por Server Actions com verificação de autenticação.
- **Rate limiting:** sliding window em memória (`src/lib/rateLimit.ts`), por instância.
- **CSP:** mesmos headers de segurança do site.
- **PWA:** manifest + Service Worker, mesmos ícones da marca.
- **Sidebar layout:** padrão de backoffice, diferente do header do site.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY          ← apenas Server Actions, nunca frontend
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET        ← apenas Server Actions, nunca frontend
NEXT_PUBLIC_SITE_URL
```
