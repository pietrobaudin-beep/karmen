"use server";

import { revalidatePath } from "next/cache";
import { requireModule } from "@/lib/session";
import { postMessage, createChannel, listMessages } from "@/lib/queries";

export type ChatMsg = {
  id: string;
  body: string;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  avatarUrl: string | null;
};

export async function postMessageAction(channelId: string, body: string): Promise<void> {
  const { user } = await requireModule("chat");
  const text = body.trim();
  if (!text) return;
  await postMessage(user.orgId, channelId, user.id, text.slice(0, 2000));
  revalidatePath("/app/chat");
}

export async function createChannelAction(formData: FormData): Promise<void> {
  const { user } = await requireModule("chat");
  const name = String(formData.get("name") ?? "");
  await createChannel(user.orgId, name);
  revalidatePath("/app/chat");
}

// Usado pelo polling do cliente para atualizar a conversa (chat "ao vivo").
export async function getMessagesAction(channelId: string): Promise<ChatMsg[]> {
  const { user } = await requireModule("chat");
  const rows = await listMessages(user.orgId, channelId, 200);
  return rows.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: new Date(m.createdAt).toISOString(),
    userId: m.userId,
    userName: m.userName,
    avatarUrl: m.avatarUrl,
  }));
}
