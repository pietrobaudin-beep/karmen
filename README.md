# KARMEN

O sistema operacional da sua empresa. V1 = capturar encontros/atendimentos → Karmen AI resume e vira tarefa → perguntar qualquer coisa sobre a operação em linguagem natural. A plataforma se **adapta à persona** (psicólogo, consultoria, professor…) via labels sobre um substrato de dados comum.

Contexto estratégico e de produto: [BRIEFING_V1.md](BRIEFING_V1.md).

## Stack
- **Next.js 15** (App Router) + TypeScript + Tailwind v4
- **PGlite** (Postgres embarcado, com `pgvector`) para dev — troca por **Supabase/Postgres** em produção sem mudar SQL
- **Drizzle ORM**
- **Claude** (`@anthropic-ai/sdk`) — tool-use tipado sobre os dados (não text-to-SQL): `claude-opus-5` no assistente, `claude-haiku-4-5` nos resumos
- Auth própria leve (cookie + senha com hash) — swappável por Supabase Auth

## Rodar

```bash
npm install
cp .env.example .env   # opcional: preencher ANTHROPIC_API_KEY para ativar a IA
npm run dev
```

App em http://localhost:3000. O banco (PGlite) se cria sozinho em `./.pglite` na primeira query (DDL idempotente em `src/db/index.ts`). Sem `ANTHROPIC_API_KEY` o app roda normalmente, mas resumos/assistente ficam desativados (degradação graciosa).

## Estrutura
```
src/
  db/          schema (Drizzle) + cliente PGlite + bootstrap DDL
  lib/
    personas.ts  presets de persona (adicionar persona = adicionar entrada aqui)
    auth.ts      signup/login/sessão
    labels.ts    labels da persona por org
    queries.ts   queries escopadas por org (tenant) — vira RLS no Supabase
    ai.ts        Karmen AI: resumo de encontro + assistente com tool-use
  app/
    (landing, login, signup)
    app/         shell autenticado + painel + entities + encounters + tasks + assistant
  components/   UI reutilizável
```

## Status (V1)
| Feature | Estado |
|---|---|
| Auth + onboarding adaptativo por persona | ✅ funcionando |
| Labels relabelados por persona (ex.: Paciente/Sessão) | ✅ |
| Multi-tenant (escopo por org na camada de dados) | ✅ |
| Entidades (CRUD) | ✅ |
| Encontros + notas | ✅ |
| Resumo automático por IA + geração de tarefas | ✅ (requer API key) |
| Tarefas (criar/concluir) | ✅ |
| Karmen AI (chat com tool-use sobre os dados) | ✅ (requer API key) |
| Busca vetorial (pgvector) no assistente | ⏳ hoje usa busca por texto; tabela `embeddings` já existe |
| Transcrição de áudio | ⏳ próxima fatia |
| Financeiro / kanban / automações | fase 2 (fora do V1) |

## Próximos passos
1. Ativar `ANTHROPIC_API_KEY` e validar o loop completo (resumo → tarefas → perguntar à Karmen).
2. Transcrição de áudio nos encontros (captura mais rica).
3. Busca vetorial no assistente (provider de embeddings + pgvector).
4. Migração para Supabase (Auth + RLS de verdade) para deploy.
