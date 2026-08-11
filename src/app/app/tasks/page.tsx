import { requireModule } from "@/lib/session";
import { listTasks, listMembers } from "@/lib/queries";
import { InlineCreate } from "@/components/InlineCreate";
import { createTaskAction } from "./actions";
import { Kanban } from "./Kanban";

export default async function TasksPage() {
  const { user } = await requireModule("tasks");
  const [rows, members] = await Promise.all([listTasks(user.orgId), listMembers(user.orgId)]);

  const tasks = rows.map((t) => ({
    ...t,
    dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
  }));

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Tarefas</h1>
        <p className="text-text-dim">Quadro da operação — inclusive o que a Karmen AI gerou.</p>
      </header>

      <div className="mb-6 max-w-xl rounded-xl border border-border bg-surface p-4">
        <InlineCreate action={createTaskAction} placeholder="Nova tarefa…" cta="+ Tarefa" />
      </div>

      <Kanban tasks={tasks} members={members.map((m) => ({ id: m.id, name: m.name }))} />
    </div>
  );
}
