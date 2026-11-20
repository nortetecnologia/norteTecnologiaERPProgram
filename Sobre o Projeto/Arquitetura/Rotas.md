# Mapa de Rotas — Norte Tecnologia ERP

Todas as rotas (exceto `/login`, `/esqueci-senha` e `/redefinir-senha`) exigem autenticação via Supabase Auth.
O middleware redireciona para `/login` qualquer acesso não autenticado.

---

## Rotas públicas

| Rota | Descrição |
|------|-----------|
| `/login` | Tela de autenticação |
| `/esqueci-senha` | Formulário de recuperação de senha por e-mail |
| `/redefinir-senha` | Redefinição de senha via código PKCE (recebido por e-mail) |

---

## Rotas protegidas

| Rota | Descrição |
|------|-----------|
| `/` | Redireciona para `/dashboard` |
| `/dashboard` | Visão geral: vendas do dia, OS abertas, estoque crítico |
| `/clientes` | Listagem e busca de clientes |
| `/clientes/novo` | Cadastro de novo cliente |
| `/clientes/[id]` | Detalhes do cliente (histórico de OS e vendas) |
| `/clientes/[id]/editar` | Edição de cliente |
| `/produtos` | Listagem de produtos e serviços com estoque |
| `/produtos/novo` | Cadastro de produto/serviço |
| `/produtos/[id]` | Detalhe do produto: dados, estatísticas e histórico completo de movimentações de estoque |
| `/produtos/[id]/editar` | Edição de produto/serviço |
| `/estoque` | Visão geral de estoque: alertas, sem SKU, sem imagem |
| `/estoque/entrada` | Entrada de mercadoria: registra lotes de estoque com fornecedor, referência/NF, custo unitário; suporte offline |
| `/os` | Listagem de Ordens de Serviço |
| `/os/nova` | Criação de nova OS |
| `/os/[id]` | Detalhes da OS |
| `/os/[id]/editar` | Edição da OS |
| `/os/[id]/imprimir` | Impressão da OS (com ou sem valores) |
| `/pdv` | Ponto de Venda |
| `/pdv/[id]/recibo` | Impressão de recibo de venda |
| `/configuracoes` | Configurações do ERP (dados da empresa, formas de pagamento) — somente admin |
| `/configuracoes/usuarios` | Gestão de usuários com acesso ao ERP: listar, alterar role (admin/operador), conceder/revogar acesso — somente admin |
| `/relatorios/exportar` | Route Handler GET — exporta CSV de vendas PDV ou OS com os mesmos filtros da tela de relatórios |
| `/funcionarios` | Listagem e gestão de funcionários e cargos |
| `/relatorios` | Relatórios de vendas e OS com exportação CSV |

---

## Server Actions

| Action | Rota | Descrição |
|--------|------|-----------|
| `loginAction` | `/login/actions.ts` | Autenticação com rate limiting |
| `logoutAction` | `/login/actions.ts` | Encerramento de sessão |
| `requestPasswordResetAction` | `/esqueci-senha/actions.ts` | Valida e-mail, verifica role ERP, dispara e-mail de reset via Supabase |
| `updatePasswordAction` | `/redefinir-senha/actions.ts` | Valida senha, troca code por sessão (PKCE), atualiza senha e desloga |
| `createCustomer` | `/clientes/actions.ts` | Criar cliente |
| `updateCustomer` | `/clientes/actions.ts` | Editar cliente |
| `deleteCustomer` | `/clientes/actions.ts` | Excluir cliente |
| `createProduct` | `/produtos/actions.ts` | Criar produto (reutiliza lógica do site) |
| `updateProduct` | `/produtos/actions.ts` | Editar produto |
| `setUserRoleAction` | `/configuracoes/usuarios/actions.ts` | Conceder/revogar/alterar role ERP de um usuário Supabase (somente admin) |
| `updateOSStatus` | `/os/actions.ts` | Mudar status da OS; ao cancelar, aceita `cancelledReason` e salva em `cancelled_reason` |
| `adjustStock` | `/estoque/actions.ts` | Ajuste manual de estoque |
| `processEntrada` | `/estoque/entrada/actions.ts` | Entrada em lote de mercadoria com fornecedor, referência e custo; suporte offline |
| `createServiceOrder` | `/os/actions.ts` | Criar OS (inclui salvar `images[]`) |
| `updateOSStatus` | `/os/actions.ts` | Mudar status da OS |
| `deleteServiceOrder` | `/os/actions.ts` | Excluir OS |
| `uploadOSImage` | `/os/uploadAction.ts` | Upload de imagem para Cloudinary (pasta `norte-tecnologia/erp-os`) |
| `createSale` | `/pdv/actions.ts` | Finalizar venda PDV com baixa de estoque |
| `createFuncionario` | `/funcionarios/actions.ts` | Criar funcionário com cargos vinculados |
| `updateFuncionario` | `/funcionarios/actions.ts` | Editar funcionário e seus cargos |
| `deleteFuncionario` | `/funcionarios/actions.ts` | Excluir funcionário |
| `toggleFuncionarioAtivo` | `/funcionarios/actions.ts` | Ativar/desativar funcionário |
| `createCargo` | `/funcionarios/actions.ts` | Criar cargo |
| `updateCargo` | `/funcionarios/actions.ts` | Editar cargo |
| `deleteCargo` | `/funcionarios/actions.ts` | Excluir cargo |

---

## Middleware

O middleware (`src/middleware.ts`) protege todas as rotas exceto `/login`, `/esqueci-senha`, `/redefinir-senha` e arquivos estáticos:

```
matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icons|manifest\\.json|sw\\.js|[^/]+\\.[a-zA-Z]+$).*)"]
```

A verificação `isPublicAsset` também exclui explicitamente extensões de arquivo comuns (`.png`, `.jpg`, `.svg`, `.webp`, `.woff2`, etc.) para que assets em `/public` sejam servidos sem autenticação.
