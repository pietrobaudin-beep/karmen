import Link from "next/link";
import { requireModule } from "@/lib/session";
import { listEncounters, listEntities } from "@/lib/queries";
import { NewEncounter } from "./NewEncounter";

export default async function EncountersPage() {
  const { user, labels } = await requireModule("encounters");
  const [rows, entities] = await Promise.all([
    listEncounters(user.orgId),
    listEntities(user.orgId),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{labels.sessionPlural}</h1>
          <p className="text-text-dim">Capture aqui — vira dado pra Karmen AI resumir.</p>
        </div>
        <NewEncounter
          entities={entities.map((e) => ({ id: e.id, name: e.name }))}
          sessionLabel={labels.session}
          entityLabel={labels.entity}
        />
      </header>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">
          Nenhum(a) {labels.session.toLowerCase()} ainda. Crie o primeiro para começar a popular a Karmen.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {rows.map((e) => (
            <li key={e.id}>
              <Link
                href={`/app/encounters/${e.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-2"
              >
                <div>
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-text-dim">{e.entityName ?? "—"}</div>
                </div>
                <span className="text-xs text-text-dim">
                  {new Date(e.occurredAt).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
