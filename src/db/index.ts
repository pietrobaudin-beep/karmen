import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Banco de dev: PGlite EM MEMÓRIA + snapshot atômico em arquivo.
// Rodar em memória evita a corrupção do diretório quando o processo é morto no
// meio de uma escrita (a causa do erro "Aborted()" ao fechar/reabrir o app).
// A durabilidade vem de snapshots (.tar.gz) gravados de forma atômica
// (grava .tmp -> rename), que nunca ficam pela metade. Ao subir, carrega o
// último snapshot. Perda máxima em um kill abrupto: o intervalo de snapshot.
// Em produção (Supabase/Postgres) nada disso é necessário.
// ---------------------------------------------------------------------------

const SNAPSHOT = process.env.KARMEN_DB_FILE ?? "./.karmen-db.tar.gz";
const SNAPSHOT_TMP = SNAPSHOT + ".tmp";
const SNAPSHOT_INTERVAL_MS = 4000;

type Db = PgliteDatabase<typeof schema>;

type GlobalWithDb = typeof globalThis & {
  __karmenClient?: PGlite;
  __karmenDb?: Db;
  __karmenInit?: Promise<void>;
  __karmenPersistTimer?: ReturnType<typeof setInterval>;
};
const g = globalThis as GlobalWithDb;

const BOOTSTRAP_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  persona_type text NOT NULL DEFAULT 'generic',
  persona_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS persona_locked boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS persona_config (
  org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  entity_label text NOT NULL,
  entity_label_plural text NOT NULL,
  session_label text NOT NULL,
  session_label_plural text NOT NULL,
  note_label text NOT NULL,
  task_label text NOT NULL,
  enabled_fields jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  permissions jsonb NOT NULL DEFAULT '[]',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS sessions_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entities_org_idx ON entities(org_id);

CREATE TABLE IF NOT EXISTS encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
  title text NOT NULL,
  kind text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS encounters_org_idx ON encounters(org_id);
CREATE INDEX IF NOT EXISTS encounters_entity_idx ON encounters(entity_id);

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  encounter_id uuid REFERENCES encounters(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notes_org_idx ON notes(org_id);
CREATE INDEX IF NOT EXISTS notes_encounter_idx ON notes(encounter_id);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
  encounter_id uuid REFERENCES encounters(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  due_date timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_org_idx ON tasks(org_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text;

CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_comments_task_idx ON task_comments(task_id);

CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS channels_org_idx ON channels(org_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_channel_idx ON chat_messages(channel_id);

CREATE TABLE IF NOT EXISTS finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'pending',
  due_date timestamptz,
  paid_at timestamptz,
  entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_org_idx ON finance_entries(org_id);
CREATE INDEX IF NOT EXISTS finance_status_idx ON finance_entries(status);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  messages jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

async function loadSnapshotBlob(): Promise<Blob | undefined> {
  try {
    if (!existsSync(SNAPSHOT)) return undefined;
    const buf = await fs.readFile(SNAPSHOT);
    return new Blob([buf]);
  } catch {
    return undefined;
  }
}

let persisting = false;
async function persist(client: PGlite): Promise<void> {
  if (persisting) return;
  persisting = true;
  try {
    const blob = await client.dumpDataDir("gzip");
    const buf = Buffer.from(await blob.arrayBuffer());
    await fs.writeFile(SNAPSHOT_TMP, buf);
    await fs.rename(SNAPSHOT_TMP, SNAPSHOT); // troca atômica: o arquivo final nunca fica parcial
  } catch {
    // snapshot é best-effort; um erro aqui não deve derrubar o app
  } finally {
    persisting = false;
  }
}

function schedulePersistence(client: PGlite) {
  if (g.__karmenPersistTimer) return;
  const timer = setInterval(() => void persist(client), SNAPSHOT_INTERVAL_MS);
  timer.unref?.();
  g.__karmenPersistTimer = timer;
}

async function init(): Promise<void> {
  const loadDataDir = await loadSnapshotBlob();
  const client = new PGlite({ loadDataDir, extensions: { vector } });
  await client.exec(BOOTSTRAP_SQL);
  g.__karmenClient = client;
  g.__karmenDb = drizzle(client, { schema });
  await persist(client); // garante um snapshot inicial
  schedulePersistence(client);
}

export async function ensureDb(): Promise<void> {
  if (!g.__karmenInit) g.__karmenInit = init();
  await g.__karmenInit;
}

// Força a gravação imediata do snapshot (usado por scripts de seed/manutenção).
export async function flushDb(): Promise<void> {
  await ensureDb();
  if (g.__karmenClient) await persist(g.__karmenClient);
}

// `db` é um proxy: os call sites usam `db.select()...` de forma síncrona, mas a
// instância real é criada de forma assíncrona no init (sempre após ensureDb()).
export const db = new Proxy({} as Db, {
  get(_t, prop) {
    if (!g.__karmenDb) throw new Error("Banco não inicializado — chame ensureDb() antes.");
    return Reflect.get(g.__karmenDb as object, prop, g.__karmenDb);
  },
}) as Db;

export { schema };
