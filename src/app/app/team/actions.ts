"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { inviteMember } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1, "Informe o nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Senha inicial de ao menos 6 caracteres."),
  role: z.enum(["admin", "member"]),
});

export type InviteState = { error?: string; ok?: boolean };

export async function inviteMemberAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const { user } = await requireUser();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const res = await inviteMember({ orgId: user.orgId, ...parsed.data });
  if (!res.ok) return { error: res.error };
  revalidatePath("/app/team");
  return { ok: true };
}
