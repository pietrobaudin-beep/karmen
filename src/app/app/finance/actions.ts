"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/session";
import { createFinance, setFinanceStatus, deleteFinance } from "@/lib/queries";
import { analyzeStatement, type ParsedEntry } from "@/lib/ai";

const MAX_CENTS = 2_000_000_000; // ~R$ 20 milhões — teto seguro para o inteiro do banco

// Converte reais em centavos válidos (inteiro positivo dentro do limite) ou null.
function safeCents(amountReais: number): number | null {
  const cents = Math.round(amountReais * 100);
  if (!Number.isFinite(cents) || cents <= 0 || cents > MAX_CENTS) return null;
  return cents;
}

function revalidate() {
  revalidatePath("/app/finance");
  revalidatePath("/app");
}

export async function createFinanceAction(formData: FormData) {
  const { user } = await requireModule("finance");
  const description = String(formData.get("description") ?? "").trim();
  const type = String(formData.get("type") ?? "income");
  const amountReais = Number(String(formData.get("amount") ?? "0").replace(",", "."));
  if (!description) return;
  const amountCents = safeCents(amountReais);
  if (amountCents === null) return;

  const dueRaw = String(formData.get("dueDate") ?? "");
  await createFinance(user.orgId, {
    type: type === "expense" ? "expense" : "income",
    description: description.slice(0, 200),
    amountCents,
    category: String(formData.get("category") ?? "") || null,
    status: String(formData.get("status") ?? "pending") === "paid" ? "paid" : "pending",
    dueDate: dueRaw ? new Date(dueRaw) : null,
    createdBy: user.id,
  });
  revalidate();
}

export async function markPaidAction(id: string, paid: boolean) {
  const { user } = await requireModule("finance");
  await setFinanceStatus(user.orgId, id, paid ? "paid" : "pending");
  revalidate();
}

export async function deleteFinanceAction(id: string) {
  const { user } = await requireModule("finance");
  await deleteFinance(user.orgId, id);
  revalidate();
}

// Lê o extrato (CSV/PDF/imagem) e devolve os lançamentos detectados p/ revisão.
export async function analyzeStatementAction(
  formData: FormData,
): Promise<{ ok: boolean; entries?: ParsedEntry[]; error?: string }> {
  await requireModule("finance");
  const file = formData.get("statement");
  if (!(file instanceof File)) return { ok: false, error: "Nenhum arquivo recebido." };
  const res = await analyzeStatement(file);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, entries: res.entries };
}

// Insere em lote os lançamentos confirmados pelo usuário.
export async function bulkCreateFinanceAction(entries: ParsedEntry[]): Promise<{ created: number }> {
  const { user } = await requireModule("finance");
  let created = 0;
  for (const e of entries) {
    if (!e.description) continue;
    const amountCents = safeCents(e.amountReais);
    if (amountCents === null) continue; // pula lançamentos inválidos (NaN, negativos, estouro)
    await createFinance(user.orgId, {
      type: e.type === "expense" ? "expense" : "income",
      description: String(e.description).slice(0, 200),
      amountCents,
      category: e.category ?? null,
      status: "paid", // extrato = já realizado
      dueDate: e.date ? new Date(e.date) : null,
      createdBy: user.id,
    });
    created++;
  }
  revalidate();
  return { created };
}
