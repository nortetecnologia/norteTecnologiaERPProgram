## 1. Apresentação

O **Norte Tecnologia ERP** é o sistema de gestão interno da Norte Tecnologia, desenvolvido para uso exclusivo pela equipe da empresa.

Funciona como complemento ao site de e-commerce, compartilhando o mesmo banco de dados Supabase e permitindo que o estoque, os produtos e as configurações sejam gerenciados em ambos os sistemas de forma sincronizada.

### 1.1. Diferença entre o site e o ERP

| Aspecto | Site (nortetecnologia.com) | ERP (erp.nortetecnologia.com) |
|---|---|---|
| Público | Clientes finais | Equipe interna |
| Acesso | Aberto + painel admin | Somente usuários autenticados |
| Foco | Vitrine, catálogo, checkout | Gestão operacional |
| Estoque | Visualização e cadastro | Controle completo com movimentações |

---

## 2. Objetivo do ERP

O ERP tem como objetivo centralizar as operações internas da Norte Tecnologia:

- Cadastro e histórico de clientes
- Gestão de produtos e serviços com controle de estoque
- Emissão e acompanhamento de Ordens de Serviço (OS)
- Ponto de Venda (PDV) para vendas presenciais

---

## 3. Banco de dados compartilhado

O ERP e o site usam o mesmo projeto Supabase. Isso significa:

- Produtos cadastrados no ERP aparecem automaticamente no site (se `is_active = true`)
- O estoque baixado pelo PDV do ERP reflete imediatamente no site
- As formas de pagamento configuradas no site estão disponíveis no PDV

Tabelas próprias do ERP têm prefixo `erp_` para evitar conflito com tabelas do site.

---

## 4. Usuários e autenticação

O ERP utiliza o mesmo Supabase Auth do site. Os usuários são criados manualmente no Supabase (sem cadastro público).

**Roles implementados:** `admin` e `operador`, armazenados em `app_metadata.erp_role` no Supabase Auth. A role é lida diretamente do JWT no middleware, sem query adicional ao banco. Usuários sem role explícita são tratados como `operador`.

Para conceder acesso ao ERP, definir `app_metadata.erp_role` via Supabase Dashboard ou via `setUserERPRole()` em `src/lib/auth.ts`.

---

## 5. Ordem de Serviço (OS)

A OS é o documento central do atendimento técnico. Cada OS contém:

- Número sequencial (NT-00001, NT-00002...)
- Cliente vinculado (obrigatório)
- Descrição do problema/serviço solicitado
- Itens: produtos utilizados e/ou serviços cobrados
- Status: Aguardando → Em andamento → Concluída → Entregue
- Opção de imprimir com ou sem valores (uso interno vs. entrega ao cliente)

A OS **não emite NF** na Fase 1. É um documento interno de controle.

---

## 6. PDV — Ponto de Venda

O PDV é para vendas presenciais no balcão. Fluxo:

1. Busca produto por nome, SKU ou código de barras
2. Adiciona ao carrinho com quantidade
3. Aplica desconto (opcional)
4. Registra forma(s) de pagamento (pode dividir entre métodos)
5. Finaliza venda — estoque baixa automaticamente
6. Imprime recibo (opcional)

O PDV usa as formas de pagamento configuradas em `store_settings.payment_methods`.

---

## 7. Fases planejadas

### Fase 1 (concluída — em produção)
- Clientes (CRUD)
- Produtos/Serviços (CRUD + estoque compartilhado com site)
- Ordens de Serviço (com upload de imagens para Cloudinary)
- PDV
- Dashboard com métricas do dia e ações rápidas
- Relatórios básicos
- Configurações (formas de pagamento)
- Autenticação com roles admin/operador via `app_metadata`
- PWA instalável

### Fase 2
- Emissão de NF-e/NFS-e via Focus NFe ou NFe.io
- Roles: admin vs. operador
- Relatórios avançados (faturamento, lucratividade)
- Integrações com CRM da empresa

### Fase 3
- App mobile nativo (React Native ou PWA avançado)
- Integração com balança e impressora térmica
