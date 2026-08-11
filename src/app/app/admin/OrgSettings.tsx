"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renameOrgAction, unlockPersonaAction } from "./actions";

export function OrgSettings({ orgName, personaLocked }: { orgName: string; personaLocked: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>("");
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await renameOrgAction(fd);
            setMsg(res.ok ? "Nome atualizado." : res.error ?? "Falha.");
            if (res.ok) router.refresh();
          })
        }
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-text-dim">Nome da organização</span>
          <input
            name="name"
            defaultValue={orgName}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
        >
          Salvar
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="text-sm">
          Tipo de conta:{" "}
          <span className={personaLocked ? "text-text-dim" : "text-ok"}>
            {personaLocked ? "🔒 travado (permanente)" : "🔓 destravado"}
          </span>
        </div>
        {personaLocked && (
          <button
            onClick={() =>
              start(async () => {
                await unlockPersonaAction();
                router.refresh();
              })
            }
            disabled={pending}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-60"
          >
            Destravar troca de tipo
          </button>
        )}
      </div>

      {msg && <p className="text-sm text-text-dim">{msg}</p>}
    </div>
  );
}
