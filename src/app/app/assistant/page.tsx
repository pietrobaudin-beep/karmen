import { requireModule } from "@/lib/session";
import { Chat } from "./Chat";

export default async function AssistantPage() {
  await requireModule("assistant");
  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col px-8 py-4">
      <header className="mb-2">
        <h1 className="text-xl font-semibold">✦ Karmen AI</h1>
      </header>
      <Chat enabled={true} />
    </div>
  );
}
