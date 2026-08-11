import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getTaskDetail, listTaskComments, listMembers } from "@/lib/queries";
import { TaskDetail } from "./TaskDetail";
import { Comments } from "./Comments";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUser();
  const task = await getTaskDetail(user.orgId, id);
  if (!task) notFound();
  const [comments, members] = await Promise.all([
    listTaskComments(user.orgId, id),
    listMembers(user.orgId),
  ]);

  const serialTask = {
    ...task,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
    createdAt: new Date(task.createdAt).toISOString(),
  };
  const serialComments = comments.map((c) => ({
    ...c,
    createdAt: new Date(c.createdAt).toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link href="/app/tasks" className="text-sm text-text-dim hover:text-text">
        ← Tarefas
      </Link>

      <div className="mt-3">
        <TaskDetail task={serialTask} members={members.map((m) => ({ id: m.id, name: m.name }))} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-medium">Comentários ({serialComments.length})</h2>
        <Comments taskId={id} comments={serialComments} currentUserName={user.name} />
      </div>
    </div>
  );
}
