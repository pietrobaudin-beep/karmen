import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";
import { getLabels, type Labels } from "@/lib/labels";
import { can, type ModuleKey } from "@/lib/permissions";

export async function requireUser(): Promise<{ user: CurrentUser; labels: Labels }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const labels = await getLabels(user.orgId, user.personaType);
  return { user, labels };
}

// Exige que o usuário tenha o módulo delegado. Owner/admin sempre passam.
// Sem permissão → volta ao Painel (o funcionário não vê nem acessa a função).
export async function requireModule(
  moduleKey: ModuleKey,
): Promise<{ user: CurrentUser; labels: Labels }> {
  const ctx = await requireUser();
  if (!can(ctx.user, moduleKey)) redirect("/app");
  return ctx;
}

// Para uso dentro de server actions: recusa sem redirecionar.
export async function assertModule(moduleKey: ModuleKey): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(user, moduleKey)) throw new Error("Sem permissão para esta função.");
  return user;
}
