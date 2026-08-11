"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { postMessageAction, getMessagesAction, createChannelAction, type ChatMsg } from "./actions";

type Channel = { id: string; name: string };

export function ChatClient({
  channels,
  selectedId,
  initialMessages,
  currentUserId,
  currentUserName,
}: {
  channels: Channel[];
  selectedId: string | null;
  initialMessages: ChatMsg[];
  currentUserId: string;
  currentUserName: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  // Polling: atualiza a conversa a cada 3s (chat "ao vivo" sem websocket).
  useEffect(() => {
    if (!selectedId) return;
    setMessages(initialMessages);
    const timer = setInterval(async () => {
      const fresh = await getMessagesAction(selectedId);
      setMessages(fresh);
    }, 3000);
    return () => clearInterval(timer);
  }, [selectedId, initialMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = input.trim();
    if (!text || !selectedId) return;
    setInput("");
    // otimista
    setMessages((m) => [
      ...m,
      {
        id: `tmp-${Date.now()}`,
        body: text,
        createdAt: new Date().toISOString(),
        userId: currentUserId,
        userName: currentUserName,
        avatarUrl: null,
      },
    ]);
    start(async () => {
      await postMessageAction(selectedId, text);
      const fresh = await getMessagesAction(selectedId);
      setMessages(fresh);
    });
  }

  return (
    <div className="flex h-screen">
      {/* Lista de canais */}
      <div className="flex w-52 shrink-0 flex-col border-r border-border bg-surface p-3">
        <h1 className="mb-3 px-1 text-lg font-semibold">Chat</h1>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {channels.map((c) => (
            <Link
              key={c.id}
              href={`/app/chat?c=${c.id}`}
              className={`truncate rounded-lg px-3 py-1.5 text-sm transition ${
                c.id === selectedId
                  ? "bg-surface-2 text-text"
                  : "text-text-dim hover:bg-surface-2 hover:text-text"
              }`}
            >
              # {c.name}
            </Link>
          ))}
        </nav>
        <form action={createChannelAction} className="mt-2 flex gap-1 border-t border-border pt-2">
          <input
            name="name"
            placeholder="novo-canal"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-2 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            +
          </button>
        </form>
      </div>

      {/* Conversa */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-text-dim">
              Nenhuma mensagem ainda. Diga olá para o time. 👋
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.userId === currentUserId;
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  <Avatar name={m.userName ?? "?"} src={m.avatarUrl} size={32} />
                  <div className={`max-w-[70%] ${mine ? "text-right" : ""}`}>
                    <div className="flex items-baseline gap-2 text-xs text-text-dim">
                      <span className="font-medium text-text">{m.userName ?? "Alguém"}</span>
                      <span>{new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div
                      className={`mt-1 inline-block whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-accent text-accent-fg" : "border border-border bg-surface text-text"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 border-t border-border p-4"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!selectedId}
            placeholder={selectedId ? "Escreva uma mensagem…" : "Crie um canal para começar"}
            className="flex-1 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!selectedId || !input.trim()}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
