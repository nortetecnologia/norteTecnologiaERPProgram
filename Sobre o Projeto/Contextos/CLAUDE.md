# Protocolo de Continuidade e Diário de Desenvolvimento

## 1. Objetivo

O arquivo `Contextos/Diário.md` será o registro contínuo da evolução do ERP Norte Tecnologia.

Sua finalidade é permitir que o agente de desenvolvimento compreenda o estado atual do projeto, recupere as últimas implementações, identifique pendências e saiba como dar continuidade ao trabalho sem repetir tarefas ou comprometer funcionalidades existentes.

## 2. Consulta obrigatória antes de iniciar qualquer tarefa

**REGRA OBRIGATÓRIA: antes de iniciar qualquer implementação, alteração, correção, refatoração ou planejamento técnico, consulte o arquivo** `Contextos/Diário.md`.

Após consultar o diário, o agente deverá:

1. Identificar a última implementação registrada.
2. Verificar quais tarefas foram concluídas.
3. Identificar tarefas em andamento ou interrompidas.
4. Consultar as próximas etapas planejadas.
5. Verificar pendências, problemas conhecidos e decisões ainda não tomadas.
6. Consultar os demais arquivos de contexto relacionados à tarefa.
7. Analisar o estado atual do código para confirmar se o diário continua refletindo a realidade do projeto.

**Não presumir que uma tarefa está concluída apenas porque ela aparece como planejada ou iniciada no diário.** Sempre verificar o código.

## 3. Regras obrigatórias do projeto

### Banco de dados
- O ERP **compartilha** o Supabase com o site de e-commerce
- Tabelas próprias do ERP têm prefixo `erp_`
- Nunca modificar tabelas do site sem autorização explícita do usuário
- `SUPABASE_SECRET_KEY` apenas em Server Actions e nunca no frontend

### Segurança
- Autenticação obrigatória em todas as rotas (middleware + verificação in-page)
- Rate limiting em todas as actions públicas
- `CLOUDINARY_API_SECRET` nunca sai do servidor

### Git e deploy
- **Nunca** adicionar `Co-Authored-By: Claude ...` nos commits (bloqueia deploy na Vercel Hobby)
- Fazer merge da feature branch no main ao finalizar cada sprint
- PowerShell JSON: usar `[System.IO.File]::WriteAllText()` com `New-Object System.Text.UTF8Encoding($false)` em vez de `Set-Content -Encoding utf8` (evita BOM)

### Design
- Sempre usar os design tokens do site: amarelo `#FFD600`, azul `#1E4FA0`, preto `#0A0A0A`
- Tema escuro por padrão
- Componentes reutilizáveis em `src/components/ui/`

## 4. Atualização obrigatória do diário

O arquivo `Contextos/Diário.md` deverá ser atualizado ao concluir cada etapa relevante do desenvolvimento.

O agente deverá registrar:
- O que foi implementado e alterado
- Quais arquivos foram afetados
- Decisões técnicas tomadas
- Problemas ou limitações conhecidos
- Próxima etapa recomendada

## 5. Encerramento de cada etapa

Ao terminar uma tarefa relevante, o agente deverá:
1. Verificar o resultado da implementação
2. Atualizar `Contextos/Diário.md`
3. Registrar as pendências que permaneceram
4. Indicar a próxima etapa recomendada
5. Fazer commit e push para a branch ativa
6. Fazer merge no main ao concluir um sprint
