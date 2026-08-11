"use client";

import { useRef, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { addTaskCommentAction } from "../actions";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  userName: string | null;
  avatarUrl: string | null;
};

export function Comments({
  taskId,
  comments,
  currentUserName,
}: {
  taskId: string;
  comments: Comment[];
  currentUserName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      {comments.length > 0 && (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar name={c.userName ?? "?"} src={c.avatarUrl} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{c.userName ?? "Alguém"}</span>
                  <span className="text-xs text-text-dim">
                    {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-text">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            await addTaskCommentAction(taskId, fd);
            formRef.current?.reset();
          })
        }
        className="flex gap-3"
      >
        <Avatar name={currentUserName} size={30} />
        <div className="flex flex-1 flex-col gap-2">
          <textarea
            name="body"
            rows={2}
            required
            placeholder="Escreva um comentário…"
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Comentar"}
          </button>
        </div>
      </form>
    </div>
  );
}
