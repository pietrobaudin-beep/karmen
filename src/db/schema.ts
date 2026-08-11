import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  vector,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// KARMEN — schema núcleo (substrato comum, relabelado por persona).
// entidade -> encontro/sessão -> nota -> tarefa, tudo escopado por org (tenant).
// ---------------------------------------------------------------------------

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // persona_type dirige os labels e campos da UI: psychologist | consultant | teacher | generic
  personaType: text("persona_type").notNull().default("generic"),
  // trava: o tipo de conta só pode ser trocado uma vez (permanente depois disso)
  personaLocked: boolean("persona_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Como relabelar/mostrar a UI por org. Preenchido a partir do preset da persona no onboarding.
export const personaConfig = pgTable("persona_config", {
  orgId: uuid("org_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  entityLabel: text("entity_label").notNull(), // "Paciente" | "Cliente" | "Aluno"
  entityLabelPlural: text("entity_label_plural").notNull(),
  sessionLabel: text("session_label").notNull(), // "Sessão" | "Reunião" | "Aula"
  sessionLabelPlural: text("session_label_plural").notNull(),
  noteLabel: text("note_label").notNull(), // "Evolução" | "Ata" | "Registro"
  taskLabel: text("task_label").notNull(), // "Follow-up" | "Entregável" | "Tarefa"
  enabledFields: jsonb("enabled_fields").$type<Record<string, boolean>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("owner"), // owner | admin | member
  // Módulos delegados ao funcionário (member). Owner/admin ignoram isto (acesso total).
  permissions: jsonb("permissions").$type<string[]>().default([]).notNull(),
  avatarUrl: text("avatar_url"), // data URL da foto de perfil (opcional)
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessionsAuth = pgTable("sessions_auth", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("entities_org_idx").on(t.orgId)],
);

export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    kind: text("kind"), // interna | cliente | estratégica | atendimento ...
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("encounters_org_idx").on(t.orgId), index("encounters_entity_idx").on(t.entityId)],
);

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    source: text("source").notNull().default("manual"), // manual | transcript | ai_summary
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notes_org_idx").on(t.orgId), index("notes_encounter_idx").on(t.encounterId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    encounterId: uuid("encounter_id").references(() => encounters.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull().default("open"), // open | doing | done
    priority: text("priority").notNull().default("normal"), // low | normal | high
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("tasks_org_idx").on(t.orgId), index("tasks_status_idx").on(t.status)],
);

// Retrieval da Karmen AI (pgvector). Guarda o texto + embedding de notas/transcrições.
export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    refType: text("ref_type").notNull(), // note | encounter | task
    refId: uuid("ref_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("embeddings_org_idx").on(t.orgId)],
);

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    taskId: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("task_comments_task_idx").on(t.taskId)],
);

// Chat interno: canais por org + mensagens.
export const channels = pgTable(
  "channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("channels_org_idx").on(t.orgId)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    channelId: uuid("channel_id")
      .references(() => channels.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("chat_messages_channel_idx").on(t.channelId)],
);

// Financeiro leve: lançamentos de receita/despesa, a pagar/receber. Valor em centavos.
export const financeEntries = pgTable(
  "finance_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(), // income | expense
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    category: text("category"),
    status: text("status").notNull().default("pending"), // pending | paid
    dueDate: timestamp("due_date", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    entityId: uuid("entity_id").references(() => entities.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("finance_org_idx").on(t.orgId), index("finance_status_idx").on(t.status)],
);

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  messages: jsonb("messages").$type<unknown[]>().default([]).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// DDL executado no bootstrap do PGlite (idempotente). Mantém paridade com Postgres/Supabase.
export const CREATE_EXTENSIONS = sql`CREATE EXTENSION IF NOT EXISTS vector;`;
