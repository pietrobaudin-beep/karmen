import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listMembers } from "@/lib/queries";
import { InviteForm } from "./InviteForm";

export default async function TeamPage() {
  const { user } = await requireUser();
  if (user.role === "member") redirect("/app"); // gestão de time é do dono/admin
  const members = await listMembers(user.orgId);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Time</h1>
        <p className="text-text-dim">Quem tem acesso a esta organização. Você pode atribuir tarefas a eles.</p>
      </header>

      <div className="mb-6">
        <InviteForm />
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">
                {m.name}
                {m.id === user.id && <span className="ml-2 text-xs text-text-dim">(você)</span>}
              </div>
              <div className="text-xs text-text-dim">{m.email}</div>
            </div>
            <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-dim">{m.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
