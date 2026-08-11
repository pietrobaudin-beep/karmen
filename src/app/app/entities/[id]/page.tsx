import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getEntity, listEncounters, listTasks } from "@/lib/queries";
import { EntityHeader } from "./EntityHeader";

export default async function EntityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, labels } = await requireUser();
  const entity = await getEntity(user.orgId, id);
  if (!entity) notFound();

  const [encounters, tasks] = await Promise.all([listEncounters(user.orgId), listTasks(user.orgId)]);
  const entEncounters = encounters.filter((e) => e.entityId === id);
  const entTasks = tasks.filter((t) => t.entityId === id);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link href="/app/entities" className="text-sm text-text-dim hover:text-text">
        ← {labels.entityPlural}
      </Link>
      <header className="mt-3 mb-6">
        <EntityHeader id={entity.id} name={entity.name} label={labels.entity} />
        <p className="mt-1 text-text-dim">
          {labels.entity} · desde {new Date(entity.createdAt).toLocaleDateString("pt-BR")}
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-medium">{labels.sessionPlural}</h2>
          {entEncounters.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhum(a) ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {entEncounters.map((e) => (
                <li key={e.id} className="py-2">
                  <Link href={`/app/encounters/${e.id}`} className="text-sm hover:underline">
                    {e.title}
                  </Link>
                  <div className="text-xs text-text-dim">
                    {new Date(e.occurredAt).toLocaleDateString("pt-BR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-medium">Tarefas</h2>
          {entTasks.length === 0 ? (
            <p className="text-sm text-text-dim">Nenhuma tarefa.</p>
          ) : (
            <ul className="divide-y divide-border">
              {entTasks.map((t) => (
                <li key={t.id} className="py-2 text-sm">
                  <span className={t.status === "done" ? "text-text-dim line-through" : ""}>
                    {t.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
