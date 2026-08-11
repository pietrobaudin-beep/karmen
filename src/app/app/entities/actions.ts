"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/session";
import { createEntity, updateEntity, deleteEntity } from "@/lib/queries";

export async function createEntityAction(formData: FormData) {
  const { user } = await requireModule("entities");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createEntity(user.orgId, name);
  revalidatePath("/app/entities");
}

export async function renameEntityAction(id: string, name: string) {
  const { user } = await requireModule("entities");
  const trimmed = name.trim();
  if (!trimmed) return;
  await updateEntity(user.orgId, id, trimmed);
  revalidatePath(`/app/entities/${id}`);
  revalidatePath("/app/entities");
}

export async function deleteEntityAction(id: string) {
  const { user } = await requireModule("entities");
  await deleteEntity(user.orgId, id);
  revalidatePath("/app/entities");
  redirect("/app/entities");
}
