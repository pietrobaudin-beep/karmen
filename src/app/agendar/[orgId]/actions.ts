"use server";

import { createBooking } from "@/lib/queries";

// Ação pública (sem autenticação): qualquer visitante pode agendar.
export async function bookAction(
  orgId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const time = String(formData.get("time") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!name) return { ok: false, error: "Informe seu nome." };
  if (!date || !time) return { ok: false, error: "Escolha data e horário." };

  const when = new Date(`${date}T${time}`);
  if (isNaN(when.getTime())) return { ok: false, error: "Data/hora inválida." };

  return createBooking(orgId, { name, contact, when, note });
}
