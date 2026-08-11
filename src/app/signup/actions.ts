"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signUp } from "@/lib/auth";
import type { PersonaType } from "@/lib/personas";

const schema = z.object({
  personaType: z.enum(["small_business", "medium_business", "enterprise", "generic"]),
  orgName: z.string().min(1, "Informe o nome da organização."),
  name: z.string().min(1, "Informe seu nome."),
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres."),
});

export type SignupState = { error?: string };

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = schema.safeParse({
    personaType: formData.get("personaType"),
    orgName: formData.get("orgName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const res = await signUp({
    ...parsed.data,
    personaType: parsed.data.personaType as PersonaType,
  });
  if (!res.ok) return { error: res.error };

  redirect("/app");
}
