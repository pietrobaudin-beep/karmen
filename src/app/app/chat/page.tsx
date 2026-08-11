import { requireModule } from "@/lib/session";
import { ensureDefaultChannel, listChannels, listMessages } from "@/lib/queries";
import { ChatClient } from "./ChatClient";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { user } = await requireModule("chat");
  await ensureDefaultChannel(user.orgId);
  const channels = await listChannels(user.orgId);
  const sp = await searchParams;
  const selected = channels.find((c) => c.id === sp.c) ?? channels[0];
  const messages = selected ? await listMessages(user.orgId, selected.id, 200) : [];

  const serial = messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: new Date(m.createdAt).toISOString(),
    userId: m.userId,
    userName: m.userName,
    avatarUrl: m.avatarUrl,
  }));

  return (
    <ChatClient
      channels={channels.map((c) => ({ id: c.id, name: c.name }))}
      selectedId={selected?.id ?? null}
      initialMessages={serial}
      currentUserId={user.id}
      currentUserName={user.name}
    />
  );
}
