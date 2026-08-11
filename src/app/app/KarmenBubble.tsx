"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { KarmenAvatar } from "@/components/KarmenAvatar";
import { askAction } from "./assistant/actions";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Tarefas atrasadas?", "Como está o financeiro?", "Últimos encontros"];

export function KarmenBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    start(async () => {
      const reply = await askAction(next);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    });
  }

  return (
    <>
      {/* Painel do chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[460px] w-[350px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
            <KarmenAvatar className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">Karmen</div>
              <div className="text-xs text-text-dim">Sua assistente</div>
            </div>
            <Link
              href="/app/assistant"
              className="rounded-lg px-2 py-1 text-xs text-text-dim hover:bg-surface hover:text-text"
              title="Abrir em tela cheia"
            >
              ⤢
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-text-dim hover:bg-surface hover:text-text"
            >
              ✕
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="mt-4 text-center">
                <KarmenAvatar className="mx-auto h-14 w-14" />
                <p className="mt-2 text-sm text-text-dim">
                  Oi! Sou a Karmen. Pergunte sobre suas tarefas, financeiro, encontros…
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-dim transition hover:bg-surface-2 hover:text-text"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && <KarmenAvatar className="mt-0.5 h-7 w-7 shrink-0" />}
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-accent text-accent-fg" : "border border-border bg-surface-2 text-text"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex gap-2">
                <KarmenAvatar className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="rounded-2xl border border-border bg-surface-2 px-3 py-2 text-sm text-text-dim">
                  digitando…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte à Karmen…"
              className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
            >
              ➤
            </button>
          </form>
        </div>
      )}

      {/* Bolinha voadora */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Falar com a Karmen"
        className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-xl ring-2 ring-brand/40 transition hover:scale-105 active:scale-95"
      >
        <KarmenAvatar className="h-full w-full" />
      </button>
    </>
  );
}
