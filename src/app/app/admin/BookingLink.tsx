"use client";

import { useEffect, useState } from "react";

export function BookingLink({ orgId }: { orgId: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/agendar/${orgId}`);
  }, [orgId]);

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-1 text-sm font-medium">Link de agendamento público</div>
      <p className="mb-3 text-xs text-text-dim">
        Compartilhe este link — qualquer pessoa pode marcar um horário, e vira um encontro na sua Agenda.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={copy}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-2"
          >
            Abrir
          </a>
        )}
      </div>
    </div>
  );
}
