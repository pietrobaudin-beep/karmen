import Link from "next/link";
import { requireModule } from "@/lib/session";
import { upcomingAgenda, listEntities } from "@/lib/queries";
import { type CalItem } from "./CalendarView";
import { AgendaBoard } from "./AgendaBoard";

export default async function AgendaPage() {
  const { user, labels } = await requireModule("agenda");
  const [data, entities] = await Promise.all([upcomingAgenda(user.orgId), listEntities(user.orgId)]);

  // Itens unificados para o calendário (encontros, prazos de tarefas e contas).
  const items: CalItem[] = [];
  for (const e of data.encounters) {
    items.push({
      date: new Date(e.occurredAt).toISOString(),
      kind: "encounter",
      tone: "brand",
      icon: "▤",
      label: e.title,
      href: `/app/encounters/${e.id}`,
    });
  }
  for (const t of data.tasks) {
    if (!t.dueDate) continue;
    items.push({
      date: new Date(t.dueDate).toISOString(),
      kind: "task",
      tone: "neutral",
      icon: "✓",
      label: t.title,
      href: `/app/tasks/${t.id}`,
      done: t.status === "done",
    });
  }
  for (const f of data.finance) {
    if (!f.dueDate) continue;
    items.push({
      date: new Date(f.dueDate).toISOString(),
      kind: "finance",
      tone: f.type === "income" ? "ok" : "danger",
      icon: "$",
      label: f.description,
      href: "/app/finance",
      done: f.status === "paid",
    });
  }

  // Lista de próximos (a partir de hoje), para leitura rápida ao lado/abaixo.
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = items
    .filter((i) => new Date(i.date) >= startOfToday && !i.done)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-text-dim">
          Encontros, prazos de tarefas e contas — no calendário. Clique num dia ou em &ldquo;+ Novo&rdquo; para
          adicionar.
        </p>
      </header>

      <AgendaBoard
        items={items}
        entities={entities.map((e) => ({ id: e.id, name: e.name }))}
        entityLabel={labels.entity}
        sessionLabel={labels.session}
      />

      <section className="mt-6">
        <h2 className="mb-3 font-medium">Próximos</h2>
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-dim">Nada agendado a partir de hoje.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {upcoming.map((i, idx) => (
              <li key={idx}>
                <Link href={i.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm">
                    {i.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{i.label}</div>
                    <div className="text-xs text-text-dim">
                      {i.kind === "encounter"
                        ? labels.session
                        : i.kind === "task"
                          ? "Tarefa"
                          : i.tone === "ok"
                            ? "A receber"
                            : "A pagar"}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-text-dim">
                    {new Date(i.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
