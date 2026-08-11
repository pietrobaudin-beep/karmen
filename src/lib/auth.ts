import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db, ensureDb } from "@/db";
import { users, sessionsAuth, organizations, personaConfig } from "@/db/schema";
import { getPreset, type PersonaType } from "@/lib/personas";
import { sanitizePermissions, type ModuleKey } from "@/lib/permissions";

const COOKIE = "karmen_session";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: ModuleKey[];
  avatarUrl: string | null;
  orgId: string;
  orgName: string;
  personaType: string;
  personaLocked: boolean;
}

async function setSessionCookie(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessionsAuth).values({ userId, token, expiresAt });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  orgName: string;
  personaType: PersonaType;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { ok: false, error: "Já existe uma conta com esse e-mail." };

  const preset = getPreset(input.personaType);
  const [org] = await db
    .insert(organizations)
    .values({ name: input.orgName.trim() || "Minha organização", personaType: preset.type })
    .returning();

  await db.insert(personaConfig).values({
    orgId: org.id,
    entityLabel: preset.entityLabel,
    entityLabelPlural: preset.entityLabelPlural,
    sessionLabel: preset.sessionLabel,
    sessionLabelPlural: preset.sessionLabelPlural,
    noteLabel: preset.noteLabel,
    taskLabel: preset.taskLabel,
    enabledFields: preset.enabledFields,
  });

  const passwordHash = await bcrypt.hash(input.password, 10);
  const [user] = await db
    .insert(users)
    .values({ orgId: org.id, name: input.name.trim(), email, passwordHash, role: "owner" })
    .returning();

  await setSessionCookie(user.id);
  return { ok: true };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);
  if (!user) return { ok: false, error: "E-mail ou senha inválidos." };
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return { ok: false, error: "E-mail ou senha inválidos." };
  await setSessionCookie(user.id);
  return { ok: true };
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await ensureDb();
    await db.delete(sessionsAuth).where(eq(sessionsAuth.token, token));
  }
  jar.delete(COOKIE);
}

// Adiciona um membro à org atual. Versão demo: o dono define uma senha inicial
// que compartilha com a pessoa. Em produção viraria convite por e-mail.
export async function inviteMember(input: {
  orgId: string;
  name: string;
  email: string;
  password: string;
  role?: string;
  permissions?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await ensureDb();
  const email = input.email.trim().toLowerCase();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return { ok: false, error: "Já existe uma conta com esse e-mail." };
  const passwordHash = await bcrypt.hash(input.password, 10);
  await db.insert(users).values({
    orgId: input.orgId,
    name: input.name.trim(),
    email,
    passwordHash,
    role: input.role ?? "member",
    permissions: sanitizePermissions(input.permissions),
  });
  return { ok: true };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  await ensureDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      permissions: users.permissions,
      avatarUrl: users.avatarUrl,
      orgId: organizations.id,
      orgName: organizations.name,
      personaType: organizations.personaType,
      personaLocked: organizations.personaLocked,
    })
    .from(sessionsAuth)
    .innerJoin(users, eq(users.id, sessionsAuth.userId))
    .innerJoin(organizations, eq(organizations.id, users.orgId))
    .where(and(eq(sessionsAuth.token, token), gt(sessionsAuth.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { ...row, permissions: sanitizePermissions(row.permissions) };
}
