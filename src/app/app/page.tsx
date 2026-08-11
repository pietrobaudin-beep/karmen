import Link from "next/link";
import { requireUser } from "@/lib/session";
import { dashboardStats, listEncounters, listTasks, financeSummary } from "@/lib/queries";
import { can } from "@/lib/permissions";
import { brl } from "@/lib/money";

export default async function Dashboard() {
  const { user, labels } = await requireUser();
  const [stats, encounters, tasks, finance] = await Promise.all([
    dashboardStats(user.orgId),
    listEncounters(user.orgId),
    listTasks(user.orgId),
    financeSummary(user.orgId),
  ]);

  // O Painel só mostra o que a pessoa pode acessar (owner/admin veem tudo).
  const showEntities = can(user, "entities");
  const showEncounters = can(user, "encounters");
  const showTasks = can(user, "tasks");
  const showFinance = can(user, "finance");
  const showAssistant = can(user, "assistant");

  const recentEncounters = encounters.slice(0, 5);
  const openTasks = tasks.filter((t) => t.status !== "done").slice(0, 5);

  // Cards de indicadores conforme as funções delegadas.
  const statCards: { label: string; value: number; href: string; danger?: boolean }[] = [];
  if (showEntities) statCards.push({ label: labels.entityPlural, value: stats.entities, href: "/app/entities" });
  if (showEncounters) statCards.push({ label: labels.sessionPlural, value: stats.encounters, href: "/app/encounters" });
  if (showTasks) {
    statCards.push({ label: "Tarefas abertas", value: stats.openTasks, href: "/app/tasks" });
    statCards.push({ label: "Atrasadas", value: stats.overdueTasks, href: "/app/tasks", danger: stats.overdueTasks > 0 });
  }

  // Insights proativos (computados — a Karmen "viva" sem custo de IA).
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const insights: string[] = [];
  if (showTasks && stats.overdueTasks > 0) insights.push(`${stats.overdueTasks} tarefa(s) atrasada(s).`);
  const dueTodayTasks = tasks.filter(
    (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < endOfToday && new Date(t.dueDate) >= now,
  ).length;
  if (showTasks && dueTodayTasks > 0) insights.push(`${dueTodayTasks} tarefa(s) vencem hoje.`);
  if (showFinance && finance.toPay > 0) insights.push(`${brl(finance.toPay)} a pagar em aberto.`);
  if (showFinance && finance.toReceive > 0) insights.push(`${brl(finance.toReceive)} a receber.`);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <p className="text-text-dim">Bem-vindo de volta, {user.name.split(" ")[0]}.</p>
      </header>

      {statCards.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statCards.map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} href={s.href} danger={s.danger} />
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {showFinance && (
          <Link
            href="/app/finance"
            className="rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-2"
          >
            <div className="text-sm text-text-dim">Saldo</div>
            <div className="mt-1 text-2xl font-semibold">{brl(finance.balance)}</div>
            <div className="mt-1 text-xs text-text-dim">
              {brl(finance.toReceive)} a receber · {brl(finance.toPay)} a pagar
            </div>
          </Link>
        )}

        <div className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <div className="text-sm font-medium text-brand">✦ Karmen notou</div>
          {insights.length === 0 ? (
            <p className="mt-1 text-sm text-text-dim">Tudo sob controle. Nada urgente agora.</p>
          ) : (
            <ul className="mt-1.5 space-y-1 text-sm text-text-dim">
              {insights.map((i, idx) => (
                <li key={idx}>• {i}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {showEncounters && (
          <Panel title={`${labels.sessionPlural} recentes`} href="/app/encounters" cta={`+ ${labels.session}`}>
            {recentEncounters.length === 0 ? (
              <Empty text={`Nenhum(a) ${labels.session.toLowerCase()} ainda.`} />
            ) : (
              <ul className="divide-y divide-border">
                {recentEncounters.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <Link href={`/app/encounters/${e.id}`} className="block hover:opacity-80">
                      <div className="text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-text-dim">
                        {e.entityName ?? "—"} · {new Date(e.occurredAt).toLocaleDateString("pt-BR")}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {showTasks && (
          <Panel title="Tarefas abertas" href="/app/tasks" cta="+ Tarefa">
            {openTasks.length === 0 ? (
              <Empty text="Nenhuma tarefa aberta." />
            ) : (
              <ul className="divide-y divide-border">
                {openTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-text-dim">
                        {t.entityName ?? "Geral"}
                        {t.dueDate ? ` · vence ${new Date(t.dueDate).toLocaleDateString("pt-BR")}` : ""}
                      </div>
                    </div>
                    {t.priority === "high" && (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 text-xs text-danger">alta</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {showAssistant && (
        <div className="mt-6 rounded-xl border border-brand/30 bg-brand/5 p-5">
          <div className="text-sm font-medium text-brand">✦ Pergunte à Karmen AI</div>
          <p className="mt-1 text-sm text-text-dim">
            &ldquo;Quais tarefas estão atrasadas?&rdquo; · &ldquo;Resume o último encontro com o cliente
            X&rdquo; · &ldquo;Cria uma tarefa pro time&rdquo;
          </p>
          <Link
            href="/app/assistant"
            className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
          >
            Abrir Karmen AI
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  danger,
}: {
  label: string;
  value: number;
  href: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface p-4 transition hover:bg-surface-2"
    >
      <div className={`text-3xl font-semibold ${danger ? "text-danger" : ""}`}>{value}</div>
      <div className="mt-1 text-sm text-text-dim">{label}</div>
    </Link>
  );
}

function Panel({
  title,
  href,
  cta,
  children,
}: {
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <Link href={href} className="text-sm text-accent hover:underline">
          {cta}
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-text-dim">{text}</p>;
}
