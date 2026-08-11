"use server";

import { requireModule } from "@/lib/session";
import { runAssistant, type ChatMessage } from "@/lib/ai";

export async function askAction(history: ChatMessage[]): Promise<string> {
  const { user, labels } = await requireModule("assistant");
  const clean = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
  return runAssistant(user.orgId, user.id, labels, clean);
}
