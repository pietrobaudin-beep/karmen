"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/session";
import { createTask, createEncounter } from "@/lib/queries";

// Cria um item a partir da Agenda. Tarefa entra no quadro de Tarefas;
// encontro entra na lista de Encontros — tudo pela mesma base, ligado automático.
export async function createAgendaItemAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule("agenda");
  const kind = String(formData.get("kind") ?? "task");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Informe um título." };

  const dateStr = String(formData.get("date") ?? "");
  const when = dateStr ? new Date(`${dateStr}T12:00`) : null;

  if (kind === "encounter") {
    const entityId = String(formData.get("entityId") ?? "") || null;
    await createEncounter(user.orgId, {
      title,
      entityId,
      occurredAt: when ?? new Date(),
      createdBy: user.id,
    });
    revalidatePath("/app/agenda");
    revalidatePath("/app/encounters");
    revalidatePath("/app");
    return { ok: true };
  }

  // tarefa (padrão) — aparece automaticamente no menu de Tarefas
  await createTask(user.orgId, {
    title,
    dueDate: when,
    priority: String(formData.get("priority") ?? "normal"),
    createdBy: user.id,
  });
  revalidatePath("/app/agenda");
  revalidatePath("/app/tasks");
  revalidatePath("/app");
  return { ok: true };
}
