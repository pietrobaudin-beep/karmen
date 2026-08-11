import { requireUser } from "@/lib/session";
import { getPreset } from "@/lib/personas";
import { ProfileForm } from "./ProfileForm";
import { PersonaPicker } from "./PersonaPicker";

export default async function SettingsPage() {
  const { user } = await requireUser();
  const persona = getPreset(user.personaType);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-text-dim">Seu perfil e conta.</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-text-dim">Perfil</h2>
        <ProfileForm name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-text-dim">Organização</h2>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Nome" value={user.orgName} />
            <Info label="Tipo" value={`${persona.emoji} ${persona.displayName}`} />
            <Info label="Seu papel" value={user.role} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-text-dim">Tipo de conta</h2>
        <PersonaPicker current={user.personaType} locked={user.personaLocked} />
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-text-dim">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
