# KARMEN — Briefing Executável do V1

> Documento vivo. Serve como contexto técnico inicial do projeto (colar/manter no Claude Code).
> Data-base: 2026-08-08.

---

## 1. Decisões travadas

| Tema | Decisão |
|---|---|
| **ICP** | Empresas de serviço/agências **E** profissionais liberais (psicólogo, professor, consultor, nutricionista, advogado...). Onboarding pergunta "o que você é?" e adapta a plataforma. |
| **Wedge V1** | **Karmen AI sobre os dados** — interface em linguagem natural. Mas depende de dados populados → V1 embute **captura leve por persona** que enche o cérebro rápido. |
| **Arquitetura de produto** | Um **substrato de dados comum** relabelado por persona. Vertical na percepção, horizontal na engenharia. |
| **Fora do V1** | Financeiro (fase 2), kanban/chat completo estilo Trello+Slack (fase 2), automações complexas (fase 2). |

### O modelo mental central: substrato comum, N personas
Por baixo, todas as personas usam a mesma estrutura:

```
ENTIDADE  →  ENCONTRO/SESSÃO  →  NOTA  →  TAREFA
(quem)       (quando/interação)   (o que ficou)  (o que fazer)
```

Relabel por persona:

| Persona | Entidade | Encontro | Nota | Tarefa |
|---|---|---|---|---|
| Psicólogo | Paciente | Sessão | Evolução clínica | Follow-up |
| Professor | Turma/Aluno | Aula | Registro de aula | Correção/planejamento |
| Consultor/Agência | Cliente | Reunião/Call | Ata/Resumo | Entregável |
| Advogado | Cliente/Processo | Reunião/Audiência | Andamento | Prazo |

**A Karmen AI opera sobre esse substrato genérico** — então ela funciona para todas as personas sem código específico por vertical.

---

## 2. Stack sugerida

Prioridade: velocidade de demonstração + multi-tenant seguro + IA sobre dados com permissões.

| Camada | Escolha | Porquê |
|---|---|---|
| **Frontend + Backend** | **Next.js 15 (App Router) + TypeScript** | Um codebase, server actions, rápido de iterar e demonstrar. |
| **DB + Auth** | **Supabase (Postgres + Auth + RLS + Realtime + pgvector)** | RLS resolve multi-tenant + permissões no nível do banco. Realtime para chat/updates. pgvector para retrieval da IA. Auth pronto. |
| **ORM** | **Drizzle** | Type-safe, leve, migrations versionadas, boa DX com Supabase. |
| **Karmen AI** | **Claude via `@anthropic-ai/sdk`** — modelo `claude-opus-5` (tool-use), `claude-haiku-4-5` para tarefas baratas (embeddings de resumo, classificação) | Tool-use sobre os dados (NL→ferramentas), respeitando tenant+permissões. NÃO text-to-SQL cru. |
| **Transcrição de reunião/áudio** | Whisper (API) ou provider de transcrição | Alimenta o substrato de dados de forma natural. |
| **Deploy** | Vercel + Supabase | Zero-ops para o V1. |
| **UI** | Tailwind + shadcn/ui | Rápido, consistente, tema claro/escuro. |

### Por que tool-use e não text-to-SQL
A Karmen AI recebe **ferramentas tipadas** (`buscar_notas`, `listar_tarefas`, `resumir_sessoes`, `criar_tarefa`...). Cada ferramenta:
- roda queries já escopadas por `tenant_id` + permissões do usuário (via RLS);
- é auditável e segura contra injeção;
- é a forma recomendada de agente sobre dados (o modelo compõe chamadas, não escreve SQL livre).

---

## 3. Modelo de dados inicial (Drizzle/Postgres)

Tabelas núcleo (nomes técnicos genéricos; o label por persona vem de `persona_config`):

```
organizations         (tenant raiz)
  id, name, persona_type, created_at

persona_config        (como relabelar/mostrar a UI por org)
  org_id, entity_label, session_label, note_label, task_label,
  enabled_fields (jsonb), created_at

users
  id, org_id, name, email, role  -- role: owner|admin|member

memberships            (usuário ↔ org, com permissões)
  user_id, org_id, permissions (jsonb)

entities               (paciente/cliente/aluno/turma...)
  id, org_id, name, metadata (jsonb), created_at

sessions               (sessão/reunião/aula/call)
  id, org_id, entity_id, title, occurred_at, kind, created_by

notes                  (evolução/ata/resumo/registro)
  id, org_id, session_id?, entity_id?, body (text),
  source (manual|transcript|ai_summary), created_by, created_at

transcripts            (áudio → texto bruto da reunião)
  id, org_id, session_id, raw_text, created_at

tasks
  id, org_id, entity_id?, session_id?, assignee_id?,
  title, status, due_date, priority, created_by, created_at

embeddings             (pgvector p/ retrieval da Karmen AI)
  id, org_id, ref_type (note|transcript|task), ref_id,
  content, embedding vector, created_at

ai_conversations       (histórico das perguntas à Karmen)
  id, org_id, user_id, messages (jsonb), created_at
```

**RLS**: toda tabela filtra por `org_id = auth.jwt() -> org_id` + checagem de permissões. A Karmen AI **nunca** vê dados fora do tenant/permissão do usuário logado.

---

## 4. Recorte exato do V1 (features)

### Núcleo mínimo demonstrável (o "wow loop")
1. **Onboarding adaptativo** — "O que você é?" → seta `persona_type` + `persona_config` (labels, campos). Seed opcional de exemplos.
2. **Cadastro de entidades** (pacientes/clientes/alunos) — CRUD simples, adaptado por persona.
3. **Captura de encontro + nota** — criar sessão/reunião, escrever nota OU subir áudio → transcrição → nota. **Este é o motor que enche o cérebro.**
4. **Resumo automático (IA)** — ao fechar uma sessão, Karmen gera resumo + extrai tarefas sugeridas.
5. **Tarefas** — lista simples, atribuição, prazo, status.
6. **Karmen AI (chat)** — perguntas sobre os dados:
   - "resume os últimos 3 atendimentos do paciente X"
   - "quais tarefas estão atrasadas?"
   - "quais clientes não retornam há 30 dias?"
   - "cria uma tarefa pro Carlos: revisar proposta até sexta"

### Ordem de construção sugerida (fatias verticais)
1. Auth + org + onboarding de persona (esqueleto multi-tenant + RLS).
2. Entidades + sessões + notas (o substrato + captura manual).
3. Embeddings + Karmen AI read-only (perguntar sobre os dados).
4. Resumo automático de sessão + geração de tarefas.
5. Karmen AI write actions (criar tarefa/nota por comando).
6. Transcrição de áudio (captura mais rica).

> **Princípio-guia:** V1 resolve UM loop muito bem — capturar encontro → IA resume → vira tarefa → responder perguntas sobre tudo. Nada de financeiro, kanban completo ou automações agora.

---

## 5. Pendências abertas
- Confirmar as **3-5 personas iniciais** a suportar no onboarding (sugestão: psicólogo, consultor/agência, professor — cobrem os padrões principais).
- Definir provider de **transcrição** e limites de custo.
- Pricing do doc original (R$397 / R$697 / R$1.197 + implantação) aponta para empresa estabelecida — validar se o profissional liberal solo entra num plano mais barato ou fica de fora do V1 pago.

---

## 6. Próximo passo técnico
Scaffold do projeto: Next.js + Supabase + Drizzle + schema acima + fluxo de onboarding de persona. Basta dar OK e eu começo pelo esqueleto multi-tenant.
