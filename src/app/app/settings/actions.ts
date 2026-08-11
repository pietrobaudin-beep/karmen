"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { updateUserProfile, changeOrgPersona } from "@/lib/queries";

export async function changePersonaAction(personaType: string): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireUser();
  if (user.role === "member") {
    return { ok: false, error: "Só o dono ou admin pode trocar o tipo de conta." };
  }
  if (user.personaLocked) {
    return { ok: false, error: "O tipo de conta já foi definido e a troca é permanente." };
  }
  await changeOrgPersona(user.orgId, personaType);
  revalidatePath("/app", "layout"); // relabela a sidebar e toda a plataforma
  return { ok: true };
}

export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe seu nome." };

  const avatar = String(formData.get("avatar") ?? "");
  const patch: { name: string; avatarUrl?: string | null } = { name };
  if (avatar === "__remove__") patch.avatarUrl = null;
  else if (avatar.startsWith("data:image/")) {
    if (avatar.length > 400_000) return { error: "Imagem muito grande. Use uma foto menor." };
    patch.avatarUrl = avatar;
  }

  await updateUserProfile(user.id, patch);
  revalidatePath("/app", "layout");
  return { ok: true };
}
