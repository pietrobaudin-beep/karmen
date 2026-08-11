"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Preencha e-mail e senha." };

  const res = await signIn(email, password);
  if (!res.ok) return { error: res.error };

  redirect("/app");
}
