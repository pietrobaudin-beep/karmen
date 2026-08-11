"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireModule } from "@/lib/session";
import { createTask, setTaskStatus, updateTask, deleteTask, addTaskComment } from "@/lib/queries";

function revalidate() {
  revalidatePath("/app/tasks");
  revalidatePath("/app");
}

export async function createTaskAction(formData: FormData) {
  const { user } = await requireModule("tasks");
  const title = String(formData.get("name") ?? "").trim();
  if (!title) return;
  await createTask(user.orgId, { title, createdBy: user.id });
  revalidate();
}

export async function toggleTaskAction(id: string, done: boolean) {
  const { user } = await requireModule("tasks");
  await setTaskStatus(user.orgId, id, done ? "done" : "open");
  revalidate();
}

export async function moveTaskAction(id: string, status: string) {
  const { user } = await requireModule("tasks");
  await updateTask(user.orgId, id, { status });
  revalidate();
}

export async function editTaskAction(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
  },
) {
  const { user } = await requireModule("tasks");
  await updateTask(user.orgId, id, {
    title: patch.title,
    description: patch.description,
    priority: patch.priority,
    dueDate: patch.dueDate ? new Date(patch.dueDate) : patch.dueDate === null ? null : undefined,
    assigneeId: patch.assigneeId === "" ? null : patch.assigneeId,
  });
  revalidate();
  revalidatePath(`/app/tasks/${id}`);
}

export async function deleteTaskAction(id: string) {
  const { user } = await requireModule("tasks");
  await deleteTask(user.orgId, id);
  revalidate();
}

export async function deleteTaskAndRedirectAction(id: string) {
  const { user } = await requireModule("tasks");
  await deleteTask(user.orgId, id);
  revalidate();
  redirect("/app/tasks");
}

export async function addTaskCommentAction(taskId: string, formData: FormData) {
  const { user } = await requireModule("tasks");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await addTaskComment(user.orgId, taskId, user.id, body);
  revalidatePath(`/app/tasks/${taskId}`);
}
