import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listMembers } from "@/lib/queries";
import { MODULES } from "@/lib/permissions";
import { sanitizePermissions } from "@/lib/permissions";
import { OrgSettings } from "./OrgSettings";
import { Members } from "./Members";
import { DangerZone } from "./DangerZone";
import { BookingLink } from "./BookingLink";

export default async function AdminPage() {
  const { user, labels } = await requireUser();
  if (user.role === "member") redirect("/app");

  const members = await listMembers(user.orgId);

  // Rótulos das funções seguem a persona (ex.: Encontros/Reuniões, Contatos/Clientes).
  const moduleLabels: Record<string, string> = {
    encounters: labels.sessionPlural,
    entities: labels.entityPlural,
  };
  const modules = MODULES.map((m) => ({
    key: m.key,
    label: moduleLabels[m.key] ?? m.label,
    responsibility: m.responsibility,
  }));

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-text-dim">
          Controle total da organização — ações que um membro comum não pode fazer. Seu papel:{" "}
          <span className="text-text">{user.role}</span>.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-text-dim">Organização</h2>
        <OrgSettings orgName={user.orgName} personaLocked={user.personaLocked} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-text-dim">Agendamento</h2>
        <BookingLink orgId={user.orgId} />
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium text-text-dim">Membros, papéis e funções</h2>
        <p className="mb-2 text-xs text-text-dim">
          Defina o papel de cada pessoa e delegue as funções pelas quais o funcionário fica responsável.
          Dono e admin têm acesso total; funcionário só acessa o que você marcar.
        </p>
        <Members
          members={members.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role,
            permissions: sanitizePermissions(m.permissions),
          }))}
          currentUserId={user.id}
          modules={modules}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-dim">Dados</h2>
        <DangerZone canPurge={user.role === "owner"} />
      </section>
    </div>
  );
}
