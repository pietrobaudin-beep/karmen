import "server-only";
import { and, desc, eq, count, lt, isNotNull, ilike, sql } from "drizzle-orm";
import { db, ensureDb } from "@/db";
import {
  organizations,
  personaConfig,
  entities,
  encounters,
  notes,
  tasks,
  users,
  financeEntries,
  taskComments,
  channels,
  chatMessages,
} from "@/db/schema";
import { getPreset } from "@/lib/personas";

// Todas as queries são escopadas por orgId (tenant). No Supabase isso vira RLS;
// aqui é enforçado na camada de dados para que nenhuma leitura vaze entre orgs.

export async function listEntities(orgId: string) {
  await ensureDb();
  return db.select().from(entities).where(eq(entities.orgId, orgId)).orderBy(desc(entities.createdAt));
}

export async function getEntity(orgId: string, id: string) {
  await ensureDb();
  const [row] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.orgId, orgId), eq(entities.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createEntity(orgId: string, name: string, metadata: Record<string, unknown> = {}) {
  await ensureDb();
  const [row] = await db.insert(entities).values({ orgId, name, metadata }).returning();
  return row;
}

export async function listEncounters(orgId: string) {
  await ensureDb();
  return db
    .select({
      id: encounters.id,
      title: encounters.title,
      kind: encounters.kind,
      occurredAt: encounters.occurredAt,
      entityId: encounters.entityId,
      entityName: entities.name,
    })
    .from(encounters)
    .leftJoin(entities, eq(entities.id, encounters.entityId))
    .where(eq(encounters.orgId, orgId))
    .orderBy(desc(encounters.occurredAt));
}

export async function getEncounter(orgId: string, id: string) {
  await ensureDb();
  const [row] = await db
    .select()
    .from(encounters)
    .where(and(eq(encounters.orgId, orgId), eq(encounters.id, id)))
    .limit(1);
  return row ?? null;
}

export async function createEncounter(
  orgId: string,
  input: {
    title: string;
    entityId?: string | null;
    kind?: string | null;
    occurredAt?: Date | null;
    createdBy: string;
  },
) {
  await ensureDb();
  const [row] = await db
    .insert(encounters)
    .values({
      orgId,
      title: input.title,
      entityId: input.entityId ?? null,
      kind: input.kind ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      createdBy: input.createdBy,
    })
    .returning();
  return row;
}

export async function updateEncounter(
  orgId: string,
  id: string,
  patch: { title?: string; entityId?: string | null; occurredAt?: Date },
) {
  await ensureDb();
  await db.update(encounters).set(patch).where(and(eq(encounters.orgId, orgId), eq(encounters.id, id)));
}

export async function deleteEncounter(orgId: string, id: string) {
  await ensureDb();
  await db.delete(encounters).where(and(eq(encounters.orgId, orgId), eq(encounters.id, id)));
}

export async function updateNote(orgId: string, id: string, body: string) {
  await ensureDb();
  await db.update(notes).set({ body }).where(and(eq(notes.orgId, orgId), eq(notes.id, id)));
}

export async function deleteNote(orgId: string, id: string) {
  await ensureDb();
  await db.delete(notes).where(and(eq(notes.orgId, orgId), eq(notes.id, id)));
}

export async function updateEntity(orgId: string, id: string, name: string) {
  await ensureDb();
  await db.update(entities).set({ name }).where(and(eq(entities.orgId, orgId), eq(entities.id, id)));
}

export async function deleteEntity(orgId: string, id: string) {
  await ensureDb();
  await db.delete(entities).where(and(eq(entities.orgId, orgId), eq(entities.id, id)));
}

// Agenda: encontros a partir de agora + tarefas com prazo futuro/atual + contas a vencer.
export async function upcomingAgenda(orgId: string) {
  await ensureDb();
  const [encs, tks, fin] = await Promise.all([
    db
      .select({
        id: encounters.id,
        title: encounters.title,
        occurredAt: encounters.occurredAt,
        entityName: entities.name,
      })
      .from(encounters)
      .leftJoin(entities, eq(entities.id, encounters.entityId))
      .where(eq(encounters.orgId, orgId))
      .orderBy(desc(encounters.occurredAt)),
    db
      .select({ id: tasks.id, title: tasks.title, dueDate: tasks.dueDate, status: tasks.status })
      .from(tasks)
      .where(and(eq(tasks.orgId, orgId), isNotNull(tasks.dueDate))),
    db
      .select({
        id: financeEntries.id,
        description: financeEntries.description,
        dueDate: financeEntries.dueDate,
        type: financeEntries.type,
        status: financeEntries.status,
      })
      .from(financeEntries)
      .where(and(eq(financeEntries.orgId, orgId), isNotNull(financeEntries.dueDate))),
  ]);
  return { encounters: encs, tasks: tks, finance: fin };
}

export async function searchNotes(orgId: string, term: string, limit = 8) {
  await ensureDb();
  return db
    .select({ body: notes.body, createdAt: notes.createdAt })
    .from(notes)
    .where(and(eq(notes.orgId, orgId), ilike(notes.body, `%${term}%`)))
    .orderBy(desc(notes.createdAt))
    .limit(limit);
}

export async function listNotesForEncounter(orgId: string, encounterId: string) {
  await ensureDb();
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.orgId, orgId), eq(notes.encounterId, encounterId)))
    .orderBy(desc(notes.createdAt));
}

export async function createNote(
  orgId: string,
  input: {
    body: string;
    encounterId?: string | null;
    entityId?: string | null;
    source?: string;
    createdBy?: string;
  },
) {
  await ensureDb();
  const [row] = await db
    .insert(notes)
    .values({
      orgId,
      body: input.body,
      encounterId: input.encounterId ?? null,
      entityId: input.entityId ?? null,
      source: input.source ?? "manual",
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function listTasks(orgId: string) {
  await ensureDb();
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      entityId: tasks.entityId,
      entityName: entities.name,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
    })
    .from(tasks)
    .leftJoin(entities, eq(entities.id, tasks.entityId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tasks.orgId, orgId))
    .orderBy(desc(tasks.createdAt));
}

export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

export async function updateTask(
  orgId: string,
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    priority?: string;
    status?: string;
    dueDate?: Date | null;
    assigneeId?: string | null;
  },
) {
  await ensureDb();
  await db.update(tasks).set(patch).where(and(eq(tasks.orgId, orgId), eq(tasks.id, id)));
}

export async function getTaskDetail(orgId: string, id: string) {
  await ensureDb();
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      entityId: tasks.entityId,
      entityName: entities.name,
      encounterId: tasks.encounterId,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .leftJoin(entities, eq(entities.id, tasks.entityId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(eq(tasks.orgId, orgId), eq(tasks.id, id)))
    .limit(1);
  return row ?? null;
}

export async function listTaskComments(orgId: string, taskId: string) {
  await ensureDb();
  return db
    .select({
      id: taskComments.id,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      userId: taskComments.userId,
      userName: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(taskComments)
    .leftJoin(users, eq(users.id, taskComments.userId))
    .where(and(eq(taskComments.orgId, orgId), eq(taskComments.taskId, taskId)))
    .orderBy(taskComments.createdAt);
}

export async function addTaskComment(orgId: string, taskId: string, userId: string, body: string) {
  await ensureDb();
  const [row] = await db
    .insert(taskComments)
    .values({ orgId, taskId, userId, body })
    .returning();
  return row;
}

export async function deleteTask(orgId: string, id: string) {
  await ensureDb();
  await db.delete(tasks).where(and(eq(tasks.orgId, orgId), eq(tasks.id, id)));
}

export async function updateUserProfile(
  userId: string,
  patch: { name?: string; avatarUrl?: string | null },
) {
  await ensureDb();
  await db.update(users).set(patch).where(eq(users.id, userId));
}

// Troca o tipo de conta (persona) da org: atualiza a org e reaplica os rótulos
// da nova persona. Não apaga dados — só relabela a adaptação da plataforma.
export async function changeOrgPersona(orgId: string, personaType: string) {
  await ensureDb();
  const preset = getPreset(personaType);
  // Troca única: além do tipo, marca como permanente (trava futuras trocas).
  await db
    .update(organizations)
    .set({ personaType: preset.type, personaLocked: true })
    .where(eq(organizations.id, orgId));
  const cfg = {
    entityLabel: preset.entityLabel,
    entityLabelPlural: preset.entityLabelPlural,
    sessionLabel: preset.sessionLabel,
    sessionLabelPlural: preset.sessionLabelPlural,
    noteLabel: preset.noteLabel,
    taskLabel: preset.taskLabel,
    enabledFields: preset.enabledFields,
  };
  const existing = await db
    .select({ orgId: personaConfig.orgId })
    .from(personaConfig)
    .where(eq(personaConfig.orgId, orgId))
    .limit(1);
  if (existing.length) {
    await db.update(personaConfig).set(cfg).where(eq(personaConfig.orgId, orgId));
  } else {
    await db.insert(personaConfig).values({ orgId, ...cfg });
  }
}

// -------------------------------- Chat interno --------------------------------

export async function listChannels(orgId: string) {
  await ensureDb();
  return db.select().from(channels).where(eq(channels.orgId, orgId)).orderBy(channels.createdAt);
}

export async function createChannel(orgId: string, name: string) {
  await ensureDb();
  const clean = name.trim().replace(/^#/, "").replace(/\s+/g, "-").toLowerCase().slice(0, 40);
  if (!clean) return null;
  const [row] = await db.insert(channels).values({ orgId, name: clean }).returning();
  return row;
}

// Garante ao menos um canal "geral" para a org (criado no primeiro acesso ao chat).
export async function ensureDefaultChannel(orgId: string) {
  await ensureDb();
  const existing = await db.select().from(channels).where(eq(channels.orgId, orgId)).limit(1);
  if (existing.length) return existing[0];
  const [row] = await db.insert(channels).values({ orgId, name: "geral" }).returning();
  return row;
}

export async function listMessages(orgId: string, channelId: string, limit = 100) {
  await ensureDb();
  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      userId: chatMessages.userId,
      userName: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(chatMessages)
    .leftJoin(users, eq(users.id, chatMessages.userId))
    .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.channelId, channelId)))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse(); // asc para exibição
}

export async function postMessage(orgId: string, channelId: string, userId: string, body: string) {
  await ensureDb();
  const [row] = await db
    .insert(chatMessages)
    .values({ orgId, channelId, userId, body })
    .returning();
  return row;
}

// ---------------------- Agendamento público (sem auth) ----------------------

export async function getOrgPublic(orgId: string) {
  await ensureDb();
  const [row] = await db
    .select({ id: organizations.id, name: organizations.name, personaType: organizations.personaType })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return row ?? null;
}

// Cria um agendamento vindo da página pública: garante o contato, cria o encontro
// e registra os dados de contato numa nota. O profissional vê na Agenda/Encontros.
export async function createBooking(
  orgId: string,
  input: { name: string; contact: string; when: Date; note?: string },
): Promise<{ ok: boolean; error?: string }> {
  await ensureDb();
  const org = await getOrgPublic(orgId);
  if (!org) return { ok: false, error: "Organização não encontrada." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe seu nome." };

  let [entity] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(and(eq(entities.orgId, orgId), ilike(entities.name, name)))
    .limit(1);
  if (!entity) {
    [entity] = await db.insert(entities).values({ orgId, name }).returning({ id: entities.id });
  }

  const [enc] = await db
    .insert(encounters)
    .values({ orgId, entityId: entity.id, title: `Agendamento: ${name}`, kind: "agendamento", occurredAt: input.when })
    .returning({ id: encounters.id });

  const body = `📅 Agendado pelo cliente.\nContato: ${input.contact || "—"}${input.note ? `\nMensagem: ${input.note}` : ""}`;
  await db.insert(notes).values({ orgId, encounterId: enc.id, entityId: entity.id, body, source: "manual" });

  return { ok: true };
}

// -------------------------------- Admin --------------------------------

export async function updateOrgName(orgId: string, name: string) {
  await ensureDb();
  await db.update(organizations).set({ name }).where(eq(organizations.id, orgId));
}

export async function setMemberRole(orgId: string, userId: string, role: string) {
  await ensureDb();
  // Ao virar owner/admin as permissões deixam de importar (acesso total);
  // ao virar member sem funções, começa sem nenhuma responsabilidade.
  const patch = role === "member" ? { role } : { role, permissions: [] as string[] };
  await db.update(users).set(patch).where(and(eq(users.orgId, orgId), eq(users.id, userId)));
}

// Define as funções (módulos) pelas quais o funcionário fica responsável.
export async function setMemberPermissions(orgId: string, userId: string, permissions: string[]) {
  await ensureDb();
  await db
    .update(users)
    .set({ permissions })
    .where(and(eq(users.orgId, orgId), eq(users.id, userId)));
}

export async function removeMember(orgId: string, userId: string) {
  await ensureDb();
  await db.delete(users).where(and(eq(users.orgId, orgId), eq(users.id, userId)));
}

export async function unlockPersona(orgId: string) {
  await ensureDb();
  await db.update(organizations).set({ personaLocked: false }).where(eq(organizations.id, orgId));
}

// Apaga TODOS os registros de um módulo da org (zona de perigo do admin).
export async function purgeOrgModule(orgId: string, module: string) {
  await ensureDb();
  switch (module) {
    case "tasks":
      await db.delete(tasks).where(eq(tasks.orgId, orgId));
      break;
    case "finance":
      await db.delete(financeEntries).where(eq(financeEntries.orgId, orgId));
      break;
    case "encounters":
      await db.delete(encounters).where(eq(encounters.orgId, orgId));
      break;
    case "entities":
      await db.delete(entities).where(eq(entities.orgId, orgId));
      break;
    case "chat":
      await db.delete(chatMessages).where(eq(chatMessages.orgId, orgId));
      break;
  }
}

export async function listMembers(orgId: string) {
  await ensureDb();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      permissions: users.permissions,
    })
    .from(users)
    .where(eq(users.orgId, orgId))
    .orderBy(desc(users.createdAt));
}

export async function createTask(
  orgId: string,
  input: {
    title: string;
    entityId?: string | null;
    encounterId?: string | null;
    priority?: string;
    dueDate?: Date | null;
    createdBy?: string;
  },
) {
  await ensureDb();
  const [row] = await db
    .insert(tasks)
    .values({
      orgId,
      title: input.title,
      entityId: input.entityId ?? null,
      encounterId: input.encounterId ?? null,
      priority: input.priority ?? "normal",
      dueDate: input.dueDate ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function setTaskStatus(orgId: string, id: string, status: string) {
  await ensureDb();
  await db.update(tasks).set({ status }).where(and(eq(tasks.orgId, orgId), eq(tasks.id, id)));
}

// -------------------------------- Financeiro --------------------------------

export async function listFinance(orgId: string) {
  await ensureDb();
  return db
    .select({
      id: financeEntries.id,
      type: financeEntries.type,
      description: financeEntries.description,
      amountCents: financeEntries.amountCents,
      category: financeEntries.category,
      status: financeEntries.status,
      dueDate: financeEntries.dueDate,
      paidAt: financeEntries.paidAt,
      entityId: financeEntries.entityId,
      entityName: entities.name,
      createdAt: financeEntries.createdAt,
    })
    .from(financeEntries)
    .leftJoin(entities, eq(entities.id, financeEntries.entityId))
    .where(eq(financeEntries.orgId, orgId))
    .orderBy(desc(financeEntries.createdAt));
}

export type FinanceItem = Awaited<ReturnType<typeof listFinance>>[number];

export async function createFinance(
  orgId: string,
  input: {
    type: string;
    description: string;
    amountCents: number;
    category?: string | null;
    status?: string;
    dueDate?: Date | null;
    entityId?: string | null;
    createdBy?: string;
  },
) {
  await ensureDb();
  // Defesa final: clampa o valor para um inteiro válido dentro do limite do banco.
  const amountCents = Number.isFinite(input.amountCents)
    ? Math.max(0, Math.min(2_000_000_000, Math.round(input.amountCents)))
    : 0;
  const [row] = await db
    .insert(financeEntries)
    .values({
      orgId,
      type: input.type,
      description: input.description,
      amountCents,
      category: input.category ?? null,
      status: input.status ?? "pending",
      dueDate: input.dueDate ?? null,
      paidAt: input.status === "paid" ? new Date() : null,
      entityId: input.entityId ?? null,
      createdBy: input.createdBy ?? null,
    })
    .returning();
  return row;
}

export async function setFinanceStatus(orgId: string, id: string, status: string) {
  await ensureDb();
  await db
    .update(financeEntries)
    .set({ status, paidAt: status === "paid" ? new Date() : null })
    .where(and(eq(financeEntries.orgId, orgId), eq(financeEntries.id, id)));
}

export async function deleteFinance(orgId: string, id: string) {
  await ensureDb();
  await db.delete(financeEntries).where(and(eq(financeEntries.orgId, orgId), eq(financeEntries.id, id)));
}

export async function financeSummary(orgId: string) {
  await ensureDb();
  const rows = await db
    .select({
      type: financeEntries.type,
      status: financeEntries.status,
      total: sql<number>`coalesce(sum(${financeEntries.amountCents}), 0)`,
    })
    .from(financeEntries)
    .where(eq(financeEntries.orgId, orgId))
    .groupBy(financeEntries.type, financeEntries.status);

  let incomePaid = 0,
    expensePaid = 0,
    toReceive = 0,
    toPay = 0;
  for (const r of rows) {
    const total = Number(r.total);
    if (r.type === "income" && r.status === "paid") incomePaid += total;
    if (r.type === "expense" && r.status === "paid") expensePaid += total;
    if (r.type === "income" && r.status === "pending") toReceive += total;
    if (r.type === "expense" && r.status === "pending") toPay += total;
  }
  return { balance: incomePaid - expensePaid, incomePaid, expensePaid, toReceive, toPay };
}

export async function dashboardStats(orgId: string) {
  await ensureDb();
  const [[ent], [enc], [openTasks], [overdue]] = await Promise.all([
    db.select({ n: count() }).from(entities).where(eq(entities.orgId, orgId)),
    db.select({ n: count() }).from(encounters).where(eq(encounters.orgId, orgId)),
    db
      .select({ n: count() })
      .from(tasks)
      .where(and(eq(tasks.orgId, orgId), eq(tasks.status, "open"))),
    db
      .select({ n: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          isNotNull(tasks.dueDate),
          lt(tasks.dueDate, new Date()),
          eq(tasks.status, "open"),
        ),
      ),
  ]);
  return {
    entities: ent?.n ?? 0,
    encounters: enc?.n ?? 0,
    openTasks: openTasks?.n ?? 0,
    overdueTasks: overdue?.n ?? 0,
  };
}
