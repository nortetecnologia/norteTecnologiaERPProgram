# Diário de Desenvolvimento — Norte Tecnologia ERP

> Registro contínuo das implementações, decisões, pendências e próximas etapas do projeto.
>
> **Regra:** consultar este documento antes de iniciar qualquer tarefa e atualizá-lo após cada etapa relevante.

---

## 1. Estado atual do projeto

- **Estágio:** Sistema em produção. Todos os módulos da Fase 1 implementados e funcionando. Fase 1+ em andamento.
- **Distribuição:** App desktop Windows (instalador `.exe` via GitHub Releases, auto-update com `electron-updater`)
- **Última atividade:** 2026-11-20 — Faturamento combinado PDV+OS + entrada de mercadoria.
- **Situação geral:** Sistema operacional. Migrations aplicadas no Supabase. Cloudinary integrado. Upload de imagens nas OS funcionando. Autenticação por `app_metadata.erp_role`. Banco de dados compartilhado com o site — colunas corretas: `is_active`, `stock`. Imagens em tabela separada `product_images(id, product_id, url, alt, is_primary, position)`.
- **Próxima etapa:** Fase 1+ continuada (ver lista de sugestões) → Fase 2 — relatórios avançados, NF-e.

---

## 2. Última atualização

- **Data:** 2026-11-20
- **Atividade:** Feat — faturamento combinado PDV+OS em relatórios + entrada de mercadoria.
- **Resultado:**
  - **`/relatorios`** (aba Vendas PDV) — banner "Faturamento total do período (PDV + OS)" com destaque amarelo mostrando o somatório PDV + OS antes dos 4 cards.
  - **`/estoque/entrada`** — nova rota para entrada de mercadoria com suporte offline: form com fornecedor, referência/NF, itens dinâmicos (produto, quantidade, custo unitário), preview do estoque após entrada. Registra movimentação `erp_stock_movements` tipo "in". Link "Entrada de mercadoria" adicionado ao cabeçalho de `/estoque`.

---

## 3. Implementações concluídas

### 2026-11-20 — Feat: detalhe de produto + gestão de usuários ERP

- **Objetivo:** Implementar as duas funcionalidades de alta prioridade confirmadas como ausentes após auditoria do código.
- **Auditoria prévia:**
  - Edição completa de OS (itens, `issued_by`, `assigned_to`) → JÁ EXISTIA em `/os/[id]/editar`
  - Busca por código de barras no PDV → JÁ EXISTIA via `handleSearchKeyDown` + match exato em `PDVClient.tsx`
  - Histórico de movimentações por produto → FALTAVA (rota `/produtos/[id]` inexistente)
  - Gestão de usuários ERP → FALTAVA (sem tela; admin precisava acessar Supabase Dashboard)
- **Implementação:**
  1. **`src/app/produtos/[id]/page.tsx`** (novo) — Server Component com detalhe do produto: imagem, status, tipo, dados (SKU, barcode, marca, categoria), 4 cards (preço, estoque atual, total entradas, total saídas), tabela de movimentações (`erp_stock_movements`) com tipo colorido, motivo, referência e data.
  2. **`src/app/configuracoes/usuarios/page.tsx`** (novo) — Server Component admin: lista todos os usuários com `erp_role` via `auth.admin.listUsers()`, badge de role, formulário inline para alterar role (admin/operador/remover acesso), seção para conceder acesso a usuários existentes sem role ERP. Acessível via botão em `/configuracoes`.
  3. **`src/app/configuracoes/usuarios/actions.ts`** (novo) — `setUserRoleAction`: Server Action que chama `setUserERPRole()` do `lib/auth.ts`, protegida por `requireAdmin()`.
  4. **`src/app/configuracoes/page.tsx`** — adicionado botão "Gerenciar usuários →" no cabeçalho.
  5. **`src/app/estoque/page.tsx`** — adicionado link "Histórico" para `/produtos/[id]` na tabela de estoque crítico; movimentações recentes linkam para o produto.
  6. **`src/lib/queries.ts`** — query `recentMovRes` passa a incluir `id` no join `products(id, name, sku)`; cache offline corrigido para incluir `id` nos produtos das movimentações.
- **TypeScript:** `tsc --noEmit` sem erros.

---

### 2026-11-17 — Feat: mecanismo de reset de senha

- **Objetivo:** Permitir que usuários com acesso ao ERP redefinam sua senha sem intervenção manual do administrador.
- **Implementação:**
  1. **`src/app/esqueci-senha/actions.ts`**: valida e-mail com `admin.auth.admin.listUsers()` + `extractRole()`; chama `resetPasswordForEmail(email, { redirectTo: "http://localhost:3721/redefinir-senha" })`.
  2. **`src/app/esqueci-senha/page.tsx`**: formulário de e-mail + estado de sucesso com instruções.
  3. **`src/app/redefinir-senha/actions.ts`**: valida senha (≥ 6 chars, confirmação) **antes** de consumir o `code`; `exchangeCodeForSession(code)` → `updateUser({ password })` → `signOut()` → `/login?reset=done`.
  4. **`src/app/redefinir-senha/page.tsx`**: exibe formulário de nova senha (com `code` oculto) ou estado de link inválido.
  5. **`src/app/login/page.tsx`**: adicionado link "Esqueci a senha", `StatusBanner` com suporte a banner verde de sucesso (`reset=done`).
  6. **`src/middleware.ts`**: `isPublicAuthPage` libera `/esqueci-senha` e `/redefinir-senha` sem autenticação.
- **Configuração obrigatória no Supabase:** Authentication → URL Configuration → Site URL: `http://localhost:3721`; Redirect URLs: `http://localhost:3721/**`.
- **Commit:** `434d7a9`

---

### 2026-11-16 — Feat: emissor/responsável na OS e vendedor/prestador no PDV

- **Objetivo:** Registrar quem emitiu e quem realizou o serviço em cada OS; registrar vendedor e prestador de serviço em cada venda PDV.
- **Implementação:**
  1. **Migration** `erp_006_employees_in_os_pdv.sql`: adiciona `issued_by` e `assigned_to` (FK → `erp_employees`) em `erp_service_orders`; `seller_id` e `service_provider_id` (FK → `erp_employees`) em `erp_pdv_sales`. FKs com `ON DELETE SET NULL`.
  2. **`src/types/index.ts`**: `ServiceOrder` recebe `issued_by?` e `assigned_to?`; `PDVSale` recebe `seller_id?` e `service_provider_id?`.
  3. **`src/app/os/nova/page.tsx`**: busca `erp_employees` (is_active) em paralelo com clientes/produtos; passa `employees` ao `OSForm`.
  4. **`src/app/os/nova/OSForm.tsx`**: nova prop `employees[]`; seção "Responsáveis" com dois `<select>` (`issued_by` / `assigned_to`) entre equipamento e mão de obra.
  5. **`src/app/os/actions.ts`**: `createServiceOrder` lê e persiste `issued_by` e `assigned_to`.
  6. **`src/app/pdv/page.tsx`**: busca `erp_employees` (is_active) em paralelo; passa `employees` ao `PDVClient`.
  7. **`src/app/pdv/PDVClient.tsx`**: nova prop `employees[]`; dois `<select>` (`seller_id` / `service_provider_id`) exibidos no painel do carrinho quando há funcionários cadastrados.
  8. **`src/app/pdv/actions.ts`**: `createSale` lê e persiste `seller_id` e `service_provider_id` (online e offline).
- **TypeScript:** `tsc --noEmit` sem erros.
- **Arquivos alterados:** `supabase/migrations/erp_006_employees_in_os_pdv.sql` (novo), `src/types/index.ts`, `src/app/os/nova/page.tsx`, `src/app/os/nova/OSForm.tsx`, `src/app/os/actions.ts`, `src/app/pdv/page.tsx`, `src/app/pdv/PDVClient.tsx`, `src/app/pdv/actions.ts`
- **Pendência:** aplicar `erp_006_employees_in_os_pdv.sql` no Supabase SQL Editor.

---

### 2026-11-13 — Feat: módulo Funcionários e Cargos

- **Objetivo:** Cadastrar e gerenciar os funcionários da empresa e seus cargos.
- **Implementação:**
  1. **Tabelas:** `erp_employees` (nome, telefone, e-mail, notas, is_active), `erp_roles` (nome, descrição, is_active), `erp_employee_roles` (N:N entre funcionário e cargo).
  2. **`src/app/funcionarios/page.tsx`** — Server Component: busca funcionários com seus cargos via join e lista de cargos disponíveis; repassa ao client.
  3. **`src/app/funcionarios/FuncionariosClient.tsx`** — Client Component com duas abas ("Funcionários" / "Cargos"), busca local, modais de criar/editar/excluir, toggle de ativo/inativo.
  4. **`src/app/funcionarios/actions.ts`** — Server Actions: `createCargo`, `updateCargo`, `deleteCargo`, `createFuncionario`, `updateFuncionario`, `deleteFuncionario`, `toggleFuncionarioAtivo`. Todas com `requireAuth()`.
  5. **`src/components/layout/Sidebar.tsx`** — item "Funcionários" adicionado ao `NAV_ITEMS`.
- **Commit:** `63d6c29`

---

### 2026-11-11 — Feat: upload de imagem na edição de OS + roles no dashboard

- **Objetivo:** Permitir adicionar/remover imagens em OS já existentes; mostrar badge de role no dashboard e ocultar ações admin para operadores.
- **Implementação:**
  1. **Upload na edição de OS:**
     - `src/app/os/[id]/OSImageUpload.tsx` — Client Component que usa `uploadOSImage` existente + nova Server Action `updateOSImages` para persistir. Upload imediato, remoção com confirmação visual.
     - `src/app/os/[id]/editActions.ts` — `updateOSImages(osId, images[])` atualiza `erp_service_orders.images` via admin client.
     - `src/app/os/[id]/page.tsx` — substituiu galeria estática pelo componente `OSImageUpload` interativo.
  2. **Roles no dashboard:**
     - `src/app/dashboard/page.tsx` — extrai role via `extractRole(user.app_metadata)`. Badge "Admin" (amarelo) ou "Operador" (cinza) ao lado do título. Botão "Configurações" aparece apenas para `role === "admin"`. Grid adapta de 4 para 5 colunas quando admin.
- **Arquivos alterados:** `src/app/os/[id]/page.tsx`, `OSImageUpload.tsx` (novo), `editActions.ts` (novo), `src/app/dashboard/page.tsx`

---

### 2026-11-10 — Fix: imagens de produtos via tabela product_images

- **Objetivo:** Corrigir "Nenhum produto encontrado" em Produtos e PDV — erro era `column products.images does not exist`.
- **Causa raiz:** As imagens de produtos não ficam em coluna na tabela `products`. Ficam em tabela separada `product_images(id, product_id, url, alt, is_primary, position)` — igual ao site e-commerce.
- **Implementação:**
  1. **Produtos/PDV (4 arquivos):** query alterada para `.select("... product_images(url, is_primary)")`. JSX e interface TypeScript atualizados para ler `p.product_images?.find(i => i.is_primary)?.url ?? p.product_images?.[0]?.url`.
  2. **`produtos/actions.ts`:** removido `payload.images = ...` (coluna não existe). Adicionada geração de `slug` obrigatório (`name-timestamp`) no insert. Após salvar produto, imagem salva em `product_images` com `is_primary: true` via insert/delete na tabela.
- **Arquivos alterados:** `src/app/produtos/page.tsx`, `ProdutoForm.tsx`, `actions.ts`, `src/app/pdv/page.tsx`, `PDVClient.tsx`

---

### 2026-11-10 — Fix: nomes de colunas produtos/PDV + configurações + validação CPF/CNPJ

- **Objetivo:** Corrigir "Nenhum produto encontrado" em Produtos e PDV, campos faltantes em Configurações e adicionar validação de CPF/CNPJ em Clientes.
- **Causa raiz:** ERP usava nomes de colunas errados para a tabela `products` (compartilhada com o site): `active` (correto: `is_active`), `stock_quantity` (correto: `stock`). Imagens não ficam em coluna de `products` — ficam em tabela separada `product_images(id, product_id, url, alt, is_primary, position)`. Configurações usava `phone` (correto: `whatsapp_number`) e não expunha `email`, `city`, `state_abbr`, `payment_methods`.
- **Nota:** Para exibir imagem de produto, usar join `.select("product_images(url, is_primary)")` e mapear `product_images.find(i => i.is_primary)?.url ?? product_images[0]?.url`.
- **Implementação:**
  1. **Produtos/PDV (6 arquivos):** renomeadas todas as referências às colunas incorretas
  2. **Configurações:** `ConfigForm.tsx` reescrito com todos os campos reais de `store_settings`; editor de formas de pagamento (adicionar/remover); `actions.ts` atualizado
  3. **Clientes:** `CustomerForm.tsx` adiciona validação client-side de CPF (11 dígitos) e CNPJ (14 dígitos) com verificação dos dígitos verificadores
- **Arquivos alterados:** `src/app/produtos/page.tsx`, `ProdutoForm.tsx`, `actions.ts`, `src/app/pdv/page.tsx`, `PDVClient.tsx`, `actions.ts`, `src/app/configuracoes/ConfigForm.tsx`, `actions.ts`, `src/app/clientes/CustomerForm.tsx`
- **Commit:** `ad639f3`

---

### 2026-11-10 — Feat: relatórios OS e Vendas separados com filtros

- **Objetivo:** Implementar relatórios de OS por dia/mês/ano com filtros opcionais por cliente (inspirado no OSVendas 5.0).
- **Implementação:** `src/app/relatorios/page.tsx` reescrito com duas abas (Vendas PDV e OS). Aba OS: filtros de ano/mês/dia e cliente; agrupamento por dia; links para cada OS.
- **Commit:** `322303e`

---

### 2026-11-10 — Fix: middleware bloqueando arquivos estáticos

- **Objetivo:** Corrigir logo quebrada na tela de login (exibia texto alternativo "Norte Tecnologia").
- **Causa raiz:** O middleware (`src/middleware.ts`) redirecionava qualquer requisição não autenticada para `/login`, incluindo `/logo.png`. O navegador recebia HTML em vez de PNG.
- **Implementação:**
  - `isPublicAsset` agora inclui regex `/\.(png|jpg|jpeg|gif|ico|svg|webp|woff2?|ttf|otf)$/i`
  - Matcher do Next.js atualizado para excluir qualquer caminho com extensão de arquivo: `[^/]+\\.[a-zA-Z]+$`
- **Arquivos alterados:** `src/middleware.ts`
- **Commit:** `41e6c0d`

---

### 2026-11-10 — Fix: logo, fonte Inter e caminhos de ícones

- **Objetivo:** Corrigir diferença de fonte entre o ERP e o site, logo quebrada e caminhos errados de ícones PWA.
- **Implementação:**
  1. **Fonte Inter:** `inter.variable` movido de `<body>` para `<html>` em `layout.tsx`, com `display: "swap"`
  2. **Logo:** trocado `<Image>` (Next.js) por `<img>` nativo na tela de login para evitar falhas do otimizador
  3. **Ícones PWA:** corrigidos de `/icons/icon-192.png` para `/icon-192.png` em `layout.tsx` e `manifest.json`
- **Arquivos alterados:** `src/app/layout.tsx`, `src/app/login/page.tsx`, `public/manifest.json`
- **Commit:** `193cec8`

---

### 2026-11-10 — Feat: upload de imagens nas Ordens de Serviço + design do dashboard

- **Objetivo:** Permitir anexar fotos do equipamento nas OS; corrigir botões de ação rápida do dashboard.
- **Implementação:**
  1. **Upload de imagens OS:**
     - `src/app/os/uploadAction.ts` — Server Action com validação de magic bytes (JPEG/PNG/WebP/GIF), assinatura SHA-1, upload para Cloudinary na pasta `norte-tecnologia/erp-os`
     - `src/app/os/nova/OSForm.tsx` — input de arquivo, preview grid, upload imediato ao selecionar, URLs ocultas no form
     - `src/app/os/actions.ts` — `createServiceOrder` extrai e salva `images[]` no banco
     - `src/app/os/[id]/page.tsx` — galeria de imagens no detalhe da OS
     - `src/types/index.ts` — `images?: string[]` adicionado à interface `ServiceOrder`
  2. **Migration manual no Supabase:** `ALTER TABLE erp_service_orders ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';`
  3. **Dashboard:** botões de ação rápida alterados de azul (`bg-brand-blue/20`) para cinza escuro (`bg-brand-gray-dark`), ícones emoji substituídos por SVG, hover amarelo
- **Arquivos alterados:** `src/app/os/uploadAction.ts` (novo), `src/app/os/nova/OSForm.tsx`, `src/app/os/actions.ts`, `src/app/os/[id]/page.tsx`, `src/types/index.ts`, `src/app/dashboard/page.tsx`
- **Commit:** `dfe054c`

---

### 2026-11-10 — Design: redesign do ERP idêntico ao admin do site

- **Objetivo:** Alinhar visual do ERP ao painel admin do site.
- **Implementação:** Padronização de cores, tipografia e componentes para manter consistência visual.
- **Commit:** `cae363c`

---

### 2026-11-10 — Feat: ERP completo — correções TypeScript, estoque, relatórios, logos

- **Objetivo:** Corrigir erros TypeScript, completar módulo de estoque, adicionar página de relatórios, adicionar logos.
- **Commit:** `c775bb0`

---

### 2026-11-10 — Feat: logos e ícones oficiais

- **Objetivo:** Adicionar `logo.png` (NT, 320×400) e ícones PWA (`icon-192.png`, `icon-512.png`) ao projeto.
- **Arquivos adicionados:** `public/logo.png`, `public/icon-192.png`, `public/icon-512.png`
- **Commit:** `1f248e2`

---

### 2026-11-10 — Refactor: acesso ERP via app_metadata do Supabase

- **Objetivo:** Simplificar controle de acesso — usar `app_metadata.erp_role` em vez de tabela `erp_user_roles`.
- **Implementação:**
  - `src/lib/auth.ts` — `extractRole()` lê `app_metadata.erp_role`; `setUserERPRole()` atualiza via Admin API
  - Middleware lê role diretamente do JWT, sem query adicional ao banco
  - Tabela `erp_user_roles` mantida como referência mas não usada ativamente
- **Roles disponíveis:** `admin` | `operador` (todo autenticado sem role explícita é tratado como `operador`)
- **Arquivos alterados:** `src/lib/auth.ts`, `src/middleware.ts`
- **Commit:** `8bae789`

---

### 2026-11-10 — Feat: autenticação e controle de acesso por papel

- **Objetivo:** Implementar sistema de roles (admin/operador) no ERP.
- **Implementação:** Migration `erp_004_user_roles.sql`, funções `requireAuth()` e `requireAdmin()` em `lib/auth.ts`
- **Commit:** `321f31f`

---

### 2026-11-10 — Feat: upload Cloudinary, imagens nos produtos/PDV, detalhe do cliente

- **Objetivo:** Integrar Cloudinary para imagens de produtos; melhorar PDV e detalhe do cliente.
- **Commit:** `06bf2f5`

---

### 2026-11-10 — Criação inicial do projeto ERP

- **Objetivo:** Criar toda a estrutura do ERP Norte Tecnologia do zero.
- **Implementação:**
  1. **Documentação:** README.md, Sobre o Projeto (contexto, stack, banco, rotas, segurança, diário, CLAUDE.md)
  2. **Config Next.js:** package.json, next.config.ts (CSP, security headers), tailwind.config.ts (mesmos tokens do site), tsconfig.json, postcss.config.mjs
  3. **Core:** globals.css (mesmos design tokens), middleware.ts (proteção de todas as rotas), layout.tsx com AppLayout (sidebar + header), tipos TypeScript ERP
  4. **Lib:** supabase/client.ts, supabase/server.ts, supabase/admin.ts, rateLimit.ts, utils.ts, cloudinary.ts
  5. **Auth:** /login (page + actions com rate limiting), page.tsx root (redirect para /dashboard)
  6. **Dashboard:** métricas do dia (vendas, OS abertas, estoque crítico, últimas vendas)
  7. **Clientes:** listagem, busca, cadastro, edição, histórico de OS
  8. **Produtos:** listagem com estoque, cadastro/edição (mesma tabela do site), controle de estoque
  9. **OS (Ordem de Serviço):** criação, edição de status, listagem, impressão com/sem valores
  10. **PDV:** busca de produto, carrinho, múltiplos pagamentos, finalização com baixa de estoque
  11. **Relatórios:** página de relatórios básica
  12. **Configurações:** página de configurações (formas de pagamento)
  13. **PWA:** manifest.json, sw.js, ícones NT
  14. **Migrations:** erp_001_customers.sql, erp_002_service_orders.sql, erp_003_pdv.sql
- **Commit:** `5578648`

---

## 4. Pendências e problemas conhecidos

| Item | Prioridade | Detalhe |
|------|-----------|--------|
| OS cancelada — motivo | MÉDIA | Campo `cancelled_reason TEXT` na OS + exibição no relatório |
| Dashboard — OS com prazo vencido | MÉDIA | Indicador "X OS com `estimated_at` < hoje" |
| PDV — rascunho / carrinho persistido | MÉDIA | Salvar carrinho em localStorage ao navegar por engano |
| Relatórios — exportar CSV | MÉDIA | Rota `/relatorios/exportar?...` retornando CSV |
| Clientes — busca por telefone/CPF | MÉDIA | Expandir `ilike` para `phone` e `cpf_cnpj` |
| Restrições de operador em ações destrutivas | MÉDIA | `requireAdmin()` em exclusão de OS, configurações |
| Relatório — faturamento combinado PDV + OS | MÉDIA | View consolidada "total do mês" |
| Entrada de mercadoria | MÉDIA | Tela de entrada de estoque com fornecedor + custo |
| Relatórios avançados | BAIXA | Fase 2 — faturamento, lucratividade |
| Emissão de NF | BAIXA | Fase 2 — Focus NFe ou NFe.io |

---

## 5. Próximas etapas

### Fase 1+ (melhorias operacionais)
1. **Motivo de cancelamento da OS** — campo `cancelled_reason`
2. **Dashboard — OS com prazo vencido** — indicador visual
3. **PDV — rascunho de venda** — persistência do carrinho
4. **Relatórios — exportar CSV** — rota simples de download
5. **Busca de clientes por telefone/CPF**
6. **Entrada de mercadoria** — ciclo completo de estoque

### Fase 2
1. **Relatórios avançados** — faturamento por período, OS por status, ticket médio
2. **Emissão de NF-e/NFS-e** — integração com Focus NFe ou NFe.io

---

## 6. Decisões técnicas

| Decisão | Motivo |
|---------|--------|
| Tabelas com prefixo `erp_` | Coexistência no mesmo Supabase sem conflito com o site |
| Mesmo Supabase Auth | Reusar usuários admin já existentes; evitar nova instância |
| `app_metadata.erp_role` para roles | Role lida do JWT sem query adicional ao banco; mais eficiente no middleware |
| OS sem NF na Fase 1 | Complexidade fiscal adiada; OS serve como documento interno |
| PWA com mesmo padrão do site | Usuário quer instalar no mobile/desktop da equipe |
| Sidebar em vez de header | ERP é ferramenta interna; sidebar é padrão de backoffice |
| `<img>` nativo na tela de login | Next.js Image optimizer falha silenciosamente para imagens portrait em containers landscape |
| Middleware exclui extensões de arquivo | Arquivos estáticos em `/public` devem ser acessíveis sem autenticação |
