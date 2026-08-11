"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/session";
import {
  createEncounter,
  createNote,
  getEncounter,
  listNotesForEncounter,
  createTask,
  getEntity,
  updateEncounter,
  deleteEncounter,
  updateNote,
  deleteNote,
} from "@/lib/queries";
import { summarizeEncounter } from "@/lib/ai";
import { transcribeAudio } from "@/lib/transcribe";

// Recebe o áudio (gravação da aba, do microfone ou arquivo importado),
// transcreve e salva como nota (source=transcript) no encontro.
export async function transcribeAction(
  encounterId: string,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule("encounters");
  const enc = await getEncounter(user.orgId, encounterId);
  if (!enc) return { ok: false, error: "Encontro não encontrado." };
  const file = formData.get("audio");
  if (!(file instanceof File)) return { ok: false, error: "Nenhum áudio recebido." };

  const result = await transcribeAudio(file);
  if (!result.ok) return { ok: false, error: result.error };

  await createNote(user.orgId, {
    body: result.text || "(transcrição vazia)",
    encounterId,
    entityId: enc.entityId,
    source: "transcript",
    createdBy: user.id,
  });
  revalidatePath(`/app/encounters/${encounterId}`);
  return { ok: true };
}

// Salva um texto já transcrito no navegador (Web Speech API, sem chave) como nota.
export async function saveTranscriptAction(
  encounterId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await requireModule("encounters");
  const enc = await getEncounter(user.orgId, encounterId);
  if (!enc) return { ok: false, error: "Encontro não encontrado." };
  const body = text.trim();
  if (!body) return { ok: false, error: "Transcrição vazia." };
  await createNote(user.orgId, {
    body,
    encounterId,
    entityId: enc.entityId,
    source: "transcript",
    createdBy: user.id,
  });
  revalidatePath(`/app/encounters/${encounterId}`);
  return { ok: true };
}

export async function createEncounterAction(formData: FormData) {
  const { user } = await requireModule("encounters");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const entityId = String(formData.get("entityId") ?? "") || null;
  const kind = String(formData.get("kind") ?? "") || null;
  const when = String(formData.get("occurredAt") ?? "");
  const enc = await createEncounter(user.orgId, {
    title,
    entityId,
    kind,
    occurredAt: when ? new Date(when) : null,
    createdBy: user.id,
  });
  redirect(`/app/encounters/${enc.id}`);
}

export async function editEncounterAction(
  id: string,
  patch: { title?: string; occurredAt?: string | null; entityId?: string | null },
) {
  const { user } = await requireModule("encounters");
  await updateEncounter(user.orgId, id, {
    title: patch.title,
    occurredAt: patch.occurredAt ? new Date(patch.occurredAt) : undefined,
    entityId: patch.entityId === "" ? null : patch.entityId,
  });
  revalidatePath(`/app/encounters/${id}`);
  revalidatePath("/app/encounters");
}

export async function deleteEncounterAction(id: string) {
  const { user } = await requireModule("encounters");
  await deleteEncounter(user.orgId, id);
  revalidatePath("/app/encounters");
  redirect("/app/encounters");
}

export async function editNoteAction(encounterId: string, noteId: string, body: string) {
  const { user } = await requireModule("encounters");
  await updateNote(user.orgId, noteId, body);
  revalidatePath(`/app/encounters/${encounterId}`);
}

export async function deleteNoteAction(encounterId: string, noteId: string) {
  const { user } = await requireModule("encounters");
  await deleteNote(user.orgId, noteId);
  revalidatePath(`/app/encounters/${encounterId}`);
}

export async function addNoteAction(encounterId: string, formData: FormData) {
  const { user } = await requireModule("encounters");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const enc = await getEncounter(user.orgId, encounterId);
  if (!enc) return;
  await createNote(user.orgId, {
    body,
    encounterId,
    entityId: enc.entityId,
    source: "manual",
    createdBy: user.id,
  });
  revalidatePath(`/app/encounters/${encounterId}`);
}

// Gera resumo por IA das notas do encontro, salva como nota (source=ai_summary)
// e cria as tarefas sugeridas. Este é o "wow loop".
export async function summarizeAction(encounterId: string) {
  const { user, labels } = await requireModule("encounters");
  const enc = await getEncounter(user.orgId, encounterId);
  if (!enc) return;
  const notes = await listNotesForEncounter(user.orgId, encounterId);
  const entity = enc.entityId ? await getEntity(user.orgId, enc.entityId) : null;
  const notesText = notes
    .filter((n) => n.source !== "ai_summary")
    .map((n) => n.body)
    .join("\n\n");

  const { summary, tasks } = await summarizeEncounter({
    title: enc.title,
    entityName: entity?.name,
    notesText,
    labels,
  });

  await createNote(user.orgId, {
    body: `📋 Resumo (Karmen AI):\n${summary}`,
    encounterId,
    entityId: enc.entityId,
    source: "ai_summary",
    createdBy: user.id,
  });

  for (const t of tasks) {
    await createTask(user.orgId, {
      title: t,
      entityId: enc.entityId,
      encounterId,
      createdBy: user.id,
    });
  }

  revalidatePath(`/app/encounters/${encounterId}`);
  revalidatePath("/app/tasks");
}
