# Norte Tecnologia — ERP

Sistema de gestão interno da **Norte Tecnologia** para controle de clientes, estoque, ordens de serviço e PDV.

Compartilha o mesmo banco de dados Supabase do site de e-commerce, permitindo que o estoque seja gerenciado em ambas as plataformas de forma sincronizada.

---

## Stack Tecnológica

| Camada         | Tecnologia                      |
|----------------|---------------------------------|
| Frontend       | Next.js 15 + TypeScript         |
| Estilo         | Tailwind CSS                    |
| Banco de Dados | Supabase (PostgreSQL) — compartilhado com o site |
| Autenticação   | Supabase Auth                   |
| Imagens        | Cloudinary                      |
| Hospedagem     | Vercel                          |

---

## Funcionalidades

### Clientes
- Cadastro e edição de clientes (nome, CPF/CNPJ, telefone, e-mail, endereço)
- Histórico de OS e compras por cliente

### Produtos e Serviços
- Cadastro usando a mesma estrutura de tabelas do site
- Controle de estoque sincronizado com o site de e-commerce
- Histórico de movimentações de estoque

### Ordens de Serviço (OS)
- Criação de OS vinculada a cliente e produtos/serviços
- Status: Aguardando, Em andamento, Concluída, Entregue, Cancelada
- Impressão com ou sem valores (modo requisição interna)
- Número sequencial automático
- Upload de fotos do equipamento (Cloudinary, pasta `norte-tecnologia/erp-os`)

### PDV — Ponto de Venda
- Venda direta com busca de produto por nome, SKU ou código de barras
- Múltiplas formas de pagamento por venda (troco, parcelamento)
- Impressão de recibo
- Baixa automática de estoque

### Estoque
- Visão consolidada com indicadores de estoque baixo
- Ajuste manual de estoque com motivo
- Histórico de entradas e saídas
- Produtos sem imagem e sem SKU

### Dashboard
- Resumo do dia (vendas, OS abertas, estoque crítico)
- Acesso rápido aos módulos com ícones SVG e hover amarelo

### Relatórios
- Resumo de vendas e OS por período (básico — Fase 1)

### Configurações
- Gerenciamento de formas de pagamento

---

## Estrutura do Projeto

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── layout.tsx          # Layout raiz (Inter font, PWA meta)
│   ├── page.tsx            # Redireciona para /dashboard ou /login
│   ├── globals.css         # Design tokens e estilos globais
│   ├── login/              # Autenticação
│   ├── dashboard/          # Tela inicial com métricas e ações rápidas
│   ├── clientes/           # Módulo de clientes
│   ├── produtos/           # Módulo de produtos/serviços
│   ├── estoque/            # Módulo de estoque
│   ├── os/                 # Ordens de Serviço (+ uploadAction.ts para Cloudinary)
│   ├── pdv/                # Ponto de Venda
│   ├── relatorios/         # Relatórios básicos
│   └── configuracoes/      # Configurações (formas de pagamento)
│
├── components/
│   ├── ui/                 # Componentes genéricos (Button, Input, Modal, Badge)
│   └── layout/             # Sidebar, Header, AppLayout
│
├── lib/
│   ├── supabase/           # Clientes Supabase (client, server, admin)
│   ├── auth.ts             # requireAuth, requireAdmin, extractRole, setUserERPRole
│   ├── cloudinary.ts       # getCloudinaryCreds()
│   ├── rateLimit.ts        # Rate limiter sliding window por IP
│   └── utils.ts            # Funções utilitárias
│
├── middleware.ts            # Proteção de rotas (exclui arquivos estáticos e /login)
│
└── types/
    └── index.ts            # Tipos TypeScript do domínio ERP
```

---

## Identidade Visual

Mesmo design do site de e-commerce:

| Token              | Valor     | Uso                         |
|--------------------|-----------|-----------------------------|
| `brand-yellow`     | `#FFD600` | CTA primário, destaques      |
| `brand-blue`       | `#1E4FA0` | Seções, acento secundário    |
| `brand-black`      | `#0A0A0A` | Fundo principal              |
| `brand-gray-dark`  | `#1A1A1A` | Fundo de seções alternadas   |
| `brand-gray-mid`   | `#2A2A2A` | Bordas, separadores          |

---

## Banco de Dados

Compartilha o mesmo projeto Supabase do site. Tabelas próprias do ERP têm prefixo `erp_`.

**Tabelas compartilhadas com o site:**
- `products` — produtos e serviços (estoque compartilhado)
- `categories`, `subcategories`
- `store_settings` — configurações (formas de pagamento)

**Tabelas exclusivas do ERP:**
- `erp_customers` — cadastro de clientes
- `erp_service_orders` — ordens de serviço
- `erp_service_order_items` — itens de cada OS
- `erp_pdv_sales` — vendas do PDV
- `erp_pdv_sale_items` — itens de cada venda
- `erp_pdv_sale_payments` — pagamentos de cada venda
- `erp_stock_movements` — movimentações de estoque

Migrations em `supabase/migrations/`.

---

## Configuração do Ambiente

Copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

| Variável                              | Descrição                         |
|---------------------------------------|-----------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`            | URL do projeto Supabase           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Chave pública (anon) do Supabase  |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| Chave publicável do Supabase      |
| `SUPABASE_SECRET_KEY`                 | Chave secreta (service_role)      |
| `CLOUDINARY_CLOUD_NAME`               | Nome do cloud no Cloudinary       |
| `CLOUDINARY_API_KEY`                  | Chave pública da API Cloudinary   |
| `CLOUDINARY_API_SECRET`               | Chave secreta da API Cloudinary   |
| `NEXT_PUBLIC_SITE_URL`                | URL pública do ERP                |

---

## Executando Localmente

```bash
npm install
npm run dev
```

Disponível em [http://localhost:3001](http://localhost:3001) (porta configurável em `package.json`).

---

## Deploy

**URL de produção:** `https://norte-tecnologia-sistema.vercel.app`

Hospedado na Vercel. Deploy automático a partir da branch `main`.

---

## Fases de Desenvolvimento

| Fase | Escopo | Status |
|------|--------|--------|
| **Fase 1** | Clientes, Produtos/Estoque, OS (com imagens), PDV, Dashboard, Relatórios básicos, Configurações, Roles admin/operador | ✅ Concluída |
| **Fase 2** | Emissão de NF-e/NFS-e, relatórios avançados, roles no dashboard | 🔜 Planejada |
| **Fase 3** | Integração CRM, app mobile nativo, integração com balança/impressora | 🔜 Planejada |

---

## Documentação do Projeto

| Documento | Conteúdo |
|-----------|----------|
| [`Sobre o Projeto/Contextos/Sobre o projeto`](./Sobre%20o%20Projeto/Contextos/Sobre%20o%20projeto%20-%20Norte%20Tecnologia%20ERP.md) | Objetivos e escopo do ERP |
| [`Sobre o Projeto/Arquitetura/STACK`](./Sobre%20o%20Projeto/Arquitetura/STACK.md) | Stack e diretrizes arquiteturais |
| [`Sobre o Projeto/Arquitetura/Banco de Dados`](./Sobre%20o%20Projeto/Arquitetura/Banco%20de%20Dados.md) | Schema e relações entre tabelas |
| [`Sobre o Projeto/Arquitetura/Rotas`](./Sobre%20o%20Projeto/Arquitetura/Rotas.md) | Mapa de rotas do ERP |
| [`Sobre o Projeto/Arquitetura/Segurança`](./Sobre%20o%20Projeto/Arquitetura/Segurança.md) | Requisitos de segurança |
| [`Sobre o Projeto/Contextos/Diário`](./Sobre%20o%20Projeto/Contextos/Diário.md) | Histórico de desenvolvimento |

---

**Domínio:** `erp.nortetecnologia.com` (a configurar na Vercel)
