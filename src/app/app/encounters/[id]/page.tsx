import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getEncounter, getEntity, listNotesForEncounter } from "@/lib/queries";
import { transcribeEnabled } from "@/lib/transcribe";
import { InlineNote } from "./InlineNote";
import { SummarizeButton } from "./SummarizeButton";
import { EncounterActions } from "./EncounterActions";
import { NoteActions } from "./NoteActions";
import { AudioCapture } from "./AudioCapture";

export default async function EncounterDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, labels } = await requireUser();
  const enc = await getEncounter(user.orgId, id);
  if (!enc) notFound();
  const [notes, entity] = await Promise.all([
    listNotesForEncounter(user.orgId, id),
    enc.entityId ? getEntity(user.orgId, enc.entityId) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link href="/app/encounters" className="text-sm text-text-dim hover:text-text">
        ← {labels.sessionPlural}
      </Link>

      <header className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{enc.title}</h1>
          <p className="text-text-dim">
            {entity ? `${labels.entity}: ${entity.name} · ` : ""}
            {new Date(enc.occurredAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SummarizeButton encounterId={enc.id} enabled={true} />
          <EncounterActions
            id={enc.id}
            title={enc.title}
            occurredAt={new Date(enc.occurredAt).toISOString()}
          />
        </div>
      </header>

      <section className="mb-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-medium text-text-dim">Nova anotação</h2>
        <InlineNote encounterId={enc.id} noteLabel={labels.note} />
      </section>

      <section className="mb-6">
        <AudioCapture encounterId={enc.id} transcribeOn={transcribeEnabled()} />
      </section>

      <section>
        <h2 className="mb-3 font-medium">{labels.note} ({notes.length})</h2>
        {notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-dim">
            Sem anotações ainda. Escreva a primeira e depois clique em &ldquo;Resumir&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li
                key={n.id}
                className={`group rounded-xl border p-4 ${
                  n.source === "ai_summary"
                    ? "border-accent/40 bg-accent/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-text-dim">
                    {n.source === "ai_summary"
                      ? "✦ Karmen AI"
                      : n.source === "transcript"
                        ? "🎙 Transcrição"
                        : "Anotação"}
                  </span>
                  <span className="text-xs text-text-dim">
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
                <NoteActions encounterId={enc.id} noteId={n.id} body={n.body} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
