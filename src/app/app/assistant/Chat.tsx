"use client";

import { useRef, useState, useTransition } from "react";
import { KarmenAvatar } from "@/components/KarmenAvatar";
import { askAction } from "./actions";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Quais tarefas estão atrasadas?",
  "Resume os últimos encontros",
  "Quantas entidades eu tenho cadastradas?",
  "Cria uma tarefa: revisar proposta amanhã",
];

export function Chat({ enabled }: { enabled: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    start(async () => {
      const reply = await askAction(next);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    });
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            <KarmenAvatar className="mx-auto h-16 w-16" />
            <h2 className="mt-3 text-lg font-medium">Pergunte qualquer coisa sobre a sua operação</h2>
            <p className="mt-1 text-sm text-text-dim">A Karmen consulta seus dados reais para responder.</p>
            {!enabled && (
              <p className="mt-3 text-sm text-danger">
                IA desativada — defina ANTHROPIC_API_KEY para conversar.
              </p>
            )}
            <div className="mx-auto mt-6 grid max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={!enabled}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm text-text-dim transition hover:bg-surface-2 hover:text-text disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && <KarmenAvatar className="mt-0.5 h-8 w-8 shrink-0" />}
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-accent text-accent-fg"
                  : "border border-border bg-surface text-text"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {pending && (
          <div className="flex justify-start gap-2">
            <KarmenAvatar className="mt-0.5 h-8 w-8 shrink-0" />
            <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm text-text-dim">
              pensando…
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
        className="flex gap-2 border-t border-border pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!enabled || pending}
          placeholder="Pergunte à Karmen…"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!enabled || pending || !input.trim()}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
