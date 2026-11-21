# Diário de Desenvolvimento — Norte Tecnologia ERP

> Registro contínuo das implementações, decisões, pendências e próximas etapas do projeto.
>
> **Regra:** consultar este documento antes de iniciar qualquer tarefa e atualizá-lo após cada etapa relevante.

---

## 1. Estado atual do projeto

- **Estágio:** Sistema em produção. Todos os módulos da Fase 1 implementados e funcionando. Fase 1+ em andamento.
- **Distribuição:** App desktop Windows (instalador `.exe` via GitHub Releases, auto-update com `electron-updater`)
- **Última atividade:** 2026-11-21 — PDV layout fix + página de orçamento com editar/excluir/fechar venda (v0.5.16).
- **Situação geral:** Sistema operacional. Migrations aplicadas no Supabase. Cloudinary integrado. Upload de imagens nas OS funcionando. Autenticação por `app_metadata.erp_role`. Banco de dados compartilhado com o site — colunas corretas: `is_active`, `stock`. Imagens em tabela separada `product_images(id, product_id, url, alt, is_primary, position)`.
- **Próxima etapa:** Fase 2 — relatórios avançados por período, lucratividade, NF-e.

---

## 2. Última atualização

- **Data:** 2026-11-21
- **Versão:** v0.5.16
- **Atividade:** PDV layout fix + página de orçamento completa.
- **Resultado:**
  - **`PDVClient.tsx`** — `w-full` no div raiz (elimina espaço preto); painel de checkout alargado para `w-[380px] lg:w-[460px]`.
  - **`pdv/orcamentos/[id]/page.tsx`** *(novo)* — página de detalhe do orçamento: itens, total, cliente, botões "Fechar Venda", "Editar", "Excluir".
  - **`pdv/orcamentos/[id]/OrcamentoActions.tsx`** *(novo)* — `FecharVendaButton` (escreve no localStorage pdv-default e redireciona ao PDV), `DeleteQuoteButton` (confirm + Server Action).
  - **`pdv/orcamentos/[id]/editar/`** *(novo)* — página + Client Component + Server Action para editar itens, cliente e desconto de um orçamento existente.
  - **`pdv/orcamentos/page.tsx`** — link "Ver" atualizado para `/pdv/orcamentos/${id}` (antes apontava para rota inexistente).

---

## 3. Implementações concluídas

### 2026-11-21 — Fix: build TS + auditoria de funcionalidades (v0.5.14)

- **Objetivo:** Corrigir erro de tipo TypeScript no build (createUserAction em form action), auditar funcionalidades pós-v0.5.12 e corrigir exibição de OS com cliente_name livre.
- **Implementação:**
  1. **`configuracoes/usuarios/CreateUserForm.tsx`** *(novo)* — Client Component com `useActionState(createUserAction, null)`: exibe erros/sucesso inline, loading state no botão. Resolve erro de tipo `Promise<{error?, success?}>` não atribuível a `form action`.
  2. **`configuracoes/usuarios/page.tsx`** — `createUserAction` removido do import; `<form action={createUserAction}>` substituído por `<CreateUserForm />`.
  3. **`OSListClient.tsx`** — Exibição de cliente na lista de OS: `erp_customers?.name ?? customer_name ?? "Cliente não encontrado"`. Corrige exibição de OS criadas com cliente livre (sem `customer_id`).
  4. **`os/[id]/page.tsx`** — Seção de cliente no detalhe de OS: `erp_customers?.name ?? customer_name ?? "—"`. Mesmo caso: OS sem `customer_id` vinculado agora exibe `customer_name`.
- **SQL necessária:** Nenhuma.

---

### 2026-11-21 — Feat: busca por número + sync movida para configurações admin (v0.5.13)

- **Objetivo:** Todos os campos de busca passam a aceitar nº de OS (NT-XXXXX), nº de pedido (#XXXXX) e nome de cliente. Controles de sincronização de rede removidos da barra superior (visível a todos) e movidos para Configurações (somente admin).
- **Implementação:**
  1. **`src/app/os/OSListClient.tsx`** — busca ao vivo agora inclui: `NT-XXXXX` (strip "nt-"/"#", parseInt, comparar com `os.number`), `formatOSNumber(os.number)` (match parcial), `os.customer_name` (cliente livre), `erp_customers.name` (cliente do cadastro). Placeholder atualizado.
  2. **`src/app/pdv/vendas/VendasTable.tsx`** — busca ao vivo agora inclui: strip "#" do termo, `sale_number` como string, formato `#000000`, nome de cliente.
  3. **`src/app/busca/page.tsx`** — busca universal: `qLow`/`strippedNum`/`qNumValid` movidos para escopo externo (acessível offline e online). Offline: compara `formatOSNumber(o.number)`, `o.customer_name`, nome via join de `allCustomers`. Online (Supabase): pré-busca IDs de clientes com `.ilike("name")`, adiciona `customer_id.in.(ids)` e `customer_name.ilike.%query%` ao `osOrParts`.
  4. **`src/components/desktop/SyncPanel.tsx`** *(novo)* — painel de sincronização com status, toggle sync on/off, Baixar do Supabase, Enviar mudanças (com badge de pendentes), Ir offline / Voltar online. Estilizado como card de configurações; retorna `null` fora do Electron.
  5. **`src/components/desktop/DesktopBar.tsx`** — simplificado: mantém apenas o banner amarelo de modo offline ativo (com botão "Voltar online"). Todos os controles de sync removidos.
  6. **`src/app/configuracoes/page.tsx`** — importa e renderiza `<SyncPanel />` no final da página (já protegida por `requireAdmin()`).
- **SQL necessária:** Nenhuma (sem mudanças de schema).

---

### 2026-11-21 — Feat: multi-tab PDV/OS, orçamentos e cliente livre (v0.5.12)

- **Objetivo:** Abrir múltiplas abas de PDV e OS para atender situações concorrentes (orçamento + venda rápida). Adicionar modo orçamento (sem baixar estoque). Permitir digitar nome do cliente sem cadastro prévio.
- **Implementação:**
  1. **`src/lib/pdv-tabs.tsx`** *(novo)* — `PDVTabsProvider` / `usePDVTabs`: contexto React que persiste abas no `localStorage("pdv_tabs_v2")`. Cada aba: `{ id, label }`. Funções: `openNewTab`, `closeTab`, `setActiveTabId`.
  2. **`src/lib/os-tabs.tsx`** *(novo)* — `OSTabsProvider` / `useOSTabs`: mesmo padrão para abas de OS.
  3. **`src/components/layout/AppLayout.tsx`** — envolto com `PDVTabsProvider > OSTabsProvider`.
  4. **`src/components/layout/Sidebar.tsx`** — sub-lista de abas clicáveis abaixo de "PDV" e "Ordens de Serviço"; cada aba tem botão × de fechar; botão "+" para nova aba.
  5. **`src/app/pdv/PDVClient.tsx`** — aceita prop `tabId`; chave de rascunho vira `pdv_draft_${tabId}`; campo `customer_name` livre abaixo do select de cliente; botão "Criar Orçamento" com `formAction={quoteAction}`.
  6. **`src/app/pdv/PDVTabsView.tsx`** *(novo)* — barra horizontal de abas + padrão show/hide (`hidden` Tailwind) para preservar estado React de cada `PDVClient`.
  7. **`src/app/pdv/page.tsx`** — usa `PDVTabsView` em vez de `PDVClient` diretamente.
  8. **`src/app/pdv/actions.ts`** — `createQuote`: salva `type='quote'`, sem baixar estoque, sem validar pagamento, retorna `{ success, saleId, saleNumber }`. `createSale` aceita e salva `customer_name`.
  9. **`src/app/pdv/orcamentos/page.tsx`** *(novo)* — lista `erp_pdv_sales` onde `type='quote'`; busca por nº (NT-XXXXX), cliente e itens; link "Orçamentos" adicionado ao cabeçalho do PDV.
  10. **`src/app/os/nova/OSForm.tsx`** — `customer_id` não obrigatório; campo `customer_name` livre adicionado.
  11. **`src/app/os/actions.ts`** — `createServiceOrder`: remove validação de `customer_id`, aceita e salva `customer_name`.
  12. **`src/app/os/nova/OSTabsView.tsx`** *(novo)* — barra de abas + OSForm por aba (show/hide).
  13. **`src/app/os/nova/page.tsx`** — usa `OSTabsView`.
- **SQL necessária (Supabase):**
  ```sql
  ALTER TABLE erp_pdv_sales
    ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'sale' CHECK (type IN ('sale','quote')),
    ADD COLUMN IF NOT EXISTS customer_name TEXT;

  ALTER TABLE erp_service_orders
    ADD COLUMN IF NOT EXISTS customer_name TEXT,
    ALTER COLUMN customer_id DROP NOT NULL;
  ```

---

### 2026-11-21 — Feat: criação de usuários pelo ERP + hierarquia Admin/Operador (v0.5.11)

- **Objetivo:** Permitir que admins criem/excluam usuários Supabase diretamente no ERP, sem acessar o painel Supabase. Implementar hierarquia de papéis com restrições de rota.
- **Implementação:**
  1. **`configuracoes/usuarios/actions.ts`** — `createUserAction`: cria usuário via `supabase.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { erp_role } })`. `deleteUserAction`: exclui via `supabase.auth.admin.deleteUser(id)` com self-protection. `setUserRoleAction` atualizado com self-protection (admin não pode alterar próprio papel).
  2. **`configuracoes/usuarios/DeleteUserButton.tsx`** *(novo)* — Client Component com `confirm()` antes de chamar `deleteUserAction`.
  3. **`configuracoes/usuarios/page.tsx`** — formulário de criação de usuário (email, senha, papel), botão de excluir por usuário, badge "conta atual" para próprio admin, card de hierarquia explicando Admin vs Operador.
  4. **`middleware.ts`** — operadores são redirecionados para `/dashboard?error=acesso_restrito` ao tentar acessar `/configuracoes`, `/relatorios` ou `/busca`.
- **Hierarquia:** Admin = acesso total + gerenciar usuários. Operador = apenas PDV, adicionar clientes, criar OS.
- **Segurança:** Service Role Key já estava disponível via `createAdminClient()`; operações de criação/exclusão ficam exclusivamente em Server Actions com `requireAdmin()`.

---

### 2026-11-21 — Feat: versão no header, busca live de OS, fix placeholder vendas (v0.5.10)

- **Objetivo:** Exibir versão do programa no cabeçalho; separar busca de OS dos filtros e torná-la em tempo real; limpar placeholder do histórico de vendas.
- **Implementação:**
  1. **`next.config.ts`** — importa `package.json` com `resolveJsonModule: true`; injeta `NEXT_PUBLIC_APP_VERSION: pkg.version` no `env` do Next.js, disponível em Client Components na build.
  2. **`src/components/layout/AppHeader.tsx`** — adiciona badge de versão ao lado de "Sistema de Gestão": `<span className="... font-mono">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>` (renderizado apenas quando variável existe).
  3. **`src/app/pdv/vendas/VendasTable.tsx`** — remove "(resultado imediato)" do placeholder, mantendo apenas "Buscar por nº, cliente ou produto...".
  4. **`src/app/os/OSListClient.tsx`** *(novo)* — Client Component `"use client"` que recebe `orders: ServiceOrder[]` e provê busca ao vivo (useState + useMemo) por título, equipamento, serial e nº OS, sem necessidade de submit. Renderiza os cards de OS com mesma aparência anterior.
  5. **`src/app/os/page.tsx`** — Remove `q` de `searchParams`, `hasAdvancedFilter`, filtros offline/online e `statusHref`. Remove campo de busca textual do `<form>`. Grid de filtros reduzido de 4 para 3 colunas (cliente, de, até). Substitui lista inline de cards por `<OSListClient orders={orders} />`.
- **Padrão:** Busca textual live no Client Component + filtros de data/cliente via server (mesmo padrão do PDV vendas).

---

### 2026-11-20 — Feat: total mensal OS no dashboard + Busca na Sidebar (v0.5.9)

- **Objetivo:** Visibilidade do faturamento de OS do mês no dashboard e acesso rápido à busca pela sidebar.
- **Implementação:**
  1. **`src/lib/queries.ts`** — `getCachedDashboard` retorna `monthlyOSTotal`. Online: query adicional `erp_service_orders.select("labor_cost, discount, erp_service_order_items(quantity, unit_price)")` para o mês corrente, filtrando `status != cancelled`. Soma em JS: `labor_cost + items_sum - discount`. Offline: mesma lógica usando `d["erp_service_order_items"]` filtrado por `service_order_id`.
  2. **`src/app/dashboard/page.tsx`** — extrai `monthOS = monthlyOSTotal ?? 0`. Subtítulo do gráfico exibe "Mês: PDV R$ X · OS R$ X · total R$ X" quando `monthOS > 0`.
  3. **`src/components/layout/Sidebar.tsx`** — item "Busca" com ícone lupa adicionado ao `NAV_ITEMS` entre Dashboard e PDV, com `exact: true`.
- **Suporte offline:** `monthlyOSTotal` computado via `readOfflineData()` com join manual de itens.

---

### 2026-11-20 — Feat: busca universal /busca + ícone no cabeçalho (v0.5.8)

- **Objetivo:** Localização rápida de qualquer registro (cliente, OS, produto) sem navegar por menus.
- **Implementação:**
  1. **`src/app/busca/page.tsx`** (novo) — Server Component que recebe `q` (mínimo 2 chars). Dois paths: offline (filtra `readOfflineData()` manualmente) e online (3 queries paralelas com `.or()` PostgREST). Exibe resultados agrupados por seção: Clientes (nome/fone/CPF), OS (nº OS, título, equip., serial, status badge), Produtos (nome, SKU, estoque). Busca com `ilike` case-insensitive; nº OS por igualdade.
  2. **`src/components/layout/AppHeader.tsx`** — adicionado `<Link href="/busca">` com ícone SVG de lupa e texto "Buscar" (oculto em mobile). Botão Sair movido para dentro do `<div>` de ações do lado direito.
- **Suporte offline:** filtro manual no branch `shouldUseLocalData()`.

---

### 2026-11-20 — Feat: OS busca expandida + total mensal no dashboard (v0.5.7)

- **Objetivo:** Melhorar busca de OS por técnicos (equip./serial/nº) e visibilidade mensal no dashboard.
- **Implementação:**
  1. **`src/app/os/page.tsx`** — adicionado import `shouldUseLocalData` / `readOfflineData`. Path de filtro avançado agora tem branch offline: filtra localmente por `title`, `equipment`, `serial_number` e `number`. Online usa `.or('title.ilike.%q%,equipment.ilike.%q%,serial_number.ilike.%q%,number.eq.N')` via PostgREST. Serial exibido no subtítulo do card. Label do campo atualizado para "Busca (título, equip., serial, nº OS)".
  2. **`src/lib/queries.ts`** — helper `firstOfMonth(todayISO)` adicionado. `getCachedDashboard` extendido com `monthlyPDVTotal`: query `erp_pdv_sales.total` a partir do primeiro dia do mês; offline soma via filter + reduce. Online executa query adicional em paralelo.
  3. **`src/app/dashboard/page.tsx`** — extrai `monthPDV` e exibe "Total do mês: R$ X.XXX,XX" abaixo do título do gráfico (oculto quando zero).
- **Suporte offline:** filtro de OS e total mensal PDV funcionam via `readOfflineData()`.

---

### 2026-11-20 — Feat: gráfico de faturamento + valor de inventário (v0.5.6)

- **Objetivo:** Melhorar visibilidade de dados — dashboard com trend visual e estoque com valor contábil.
- **Implementação:**
  1. **`src/lib/queries.ts`** — `buildLast7Days(todayISO)` helper (puro, sem efeitos). `getCachedDashboard` retorna agora `dailyRevenueRes: { date, pdv, osCount }[]` via duas queries adicionais (`erp_pdv_sales` e `erp_service_orders` dos últimos 7 dias). Offline computa a partir do JSON local. `getCachedStock` passa a incluir `price` no select (online path).
  2. **`src/app/dashboard/page.tsx`** — extrai `dailyRevenue` e `maxPdv`. Renderiza gráfico de barras CSS puro (sem biblioteca) acima das últimas vendas: container `h-24 flex items-end`, barras com `height: X%` relativo à maior barra, tooltip via `title=""` nativo (hover). Legenda textual abaixo. Oculto automaticamente se todos os valores forem zero.
  3. **`src/app/estoque/page.tsx`** — calcula `inventoryValue` e `totalUnits` a partir de `allProductsRes`. Banner amarelo acima dos cards de alerta com 3 métricas: valor total, produtos ativos, unidades totais.
- **Suporte offline:** `dailyRevenueRes` usa `shouldUseLocalData()` / `readOfflineData()` existentes. Valor de inventário usa dados de `allProductsRes` que já vinha do JSON local.
- **TypeScript:** sem `any` extras além dos já existentes.

---

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
