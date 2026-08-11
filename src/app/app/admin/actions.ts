"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  updateOrgName,
  setMemberRole,
  setMemberPermissions,
  removeMember,
  unlockPersona,
  purgeOrgModule,
} from "@/lib/queries";
import { sanitizePermissions } from "@/lib/permissions";

type Result = { ok: boolean; error?: string };

async function requireAdmin() {
  const { user } = await requireUser();
  if (user.role === "member") return { user, denied: true as const };
  return { user, denied: false as const };
}

export async function renameOrgAction(formData: FormData): Promise<Result> {
  const { user, denied } = await requireAdmin();
  if (denied) return { ok: false, error: "Sem permissão." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Informe um nome." };
  await updateOrgName(user.orgId, name);
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function setRoleAction(userId: string, role: string): Promise<Result> {
  const { user, denied } = await requireAdmin();
  if (denied) return { ok: false, error: "Sem permissão." };
  if (userId === user.id) return { ok: false, error: "Você não pode mudar o próprio papel." };
  if (!["owner", "admin", "member"].includes(role)) return { ok: false, error: "Papel inválido." };
  await setMemberRole(user.orgId, userId, role);
  revalidatePath("/app/admin");
  return { ok: true };
}

// Delega/atualiza as funções (módulos) pelas quais o funcionário é responsável.
export async function setPermissionsAction(userId: string, permissions: string[]): Promise<Result> {
  const { user, denied } = await requireAdmin();
  if (denied) return { ok: false, error: "Sem permissão." };
  if (userId === user.id) return { ok: false, error: "Você não delega funções a si mesmo." };
  await setMemberPermissions(user.orgId, userId, sanitizePermissions(permissions));
  revalidatePath("/app/admin");
  revalidatePath("/app", "layout"); // atualiza a sidebar do funcionário
  return { ok: true };
}

export async function removeMemberAction(userId: string): Promise<Result> {
  const { user, denied } = await requireAdmin();
  if (denied) return { ok: false, error: "Sem permissão." };
  if (userId === user.id) return { ok: false, error: "Você não pode remover a si mesmo." };
  await removeMember(user.orgId, userId);
  revalidatePath("/app/admin");
  return { ok: true };
}

export async function unlockPersonaAction(): Promise<Result> {
  const { user, denied } = await requireAdmin();
  if (denied) return { ok: false, error: "Sem permissão." };
  await unlockPersona(user.orgId);
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function purgeAction(module: string): Promise<Result> {
  const { user, denied } = await requireAdmin();
  if (denied) return { ok: false, error: "Sem permissão." };
  if (user.role !== "owner") return { ok: false, error: "Apenas o dono pode apagar dados." };
  await purgeOrgModule(user.orgId, module);
  revalidatePath("/app", "layout");
  return { ok: true };
}
