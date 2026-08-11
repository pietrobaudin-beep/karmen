import Link from "next/link";
import { requireModule } from "@/lib/session";
import { listEntities } from "@/lib/queries";
import { InlineCreate } from "@/components/InlineCreate";
import { createEntityAction } from "./actions";

export default async function EntitiesPage() {
  const { user, labels } = await requireModule("entities");
  const rows = await listEntities(user.orgId);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{labels.entityPlural}</h1>
        <p className="text-text-dim">Seu cadastro de {labels.entityPlural.toLowerCase()}.</p>
      </header>

      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <InlineCreate
          action={createEntityAction}
          placeholder={`Nome do(a) ${labels.entity.toLowerCase()}`}
          cta={`+ ${labels.entity}`}
        />
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">
          Nenhum(a) {labels.entity.toLowerCase()} cadastrado(a) ainda.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {rows.map((e) => (
            <li key={e.id}>
              <Link
                href={`/app/entities/${e.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-surface-2"
              >
                <span className="font-medium">{e.name}</span>
                <span className="text-xs text-text-dim">
                  {new Date(e.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
