"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { setRoleAction, removeMemberAction, setPermissionsAction } from "./actions";

type Member = { id: string; name: string; email: string; role: string; permissions: string[] };
type Mod = { key: string; label: string; responsibility: string };

export function Members({
  members,
  currentUserId,
  modules,
}: {
  members: Member[];
  currentUserId: string;
  modules: Mod[];
}) {
  const [pending, start] = useTransition();

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {members.map((m) => (
        <MemberRow key={m.id} m={m} self={m.id === currentUserId} modules={modules} pending={pending} start={start} />
      ))}
    </ul>
  );
}

function MemberRow({
  m,
  self,
  modules,
  pending,
  start,
}: {
  m: Member;
  self: boolean;
  modules: Mod[];
  pending: boolean;
  start: (fn: () => void) => void;
}) {
  // Estado otimista das permissões (o funcionário reflete no próximo carregamento).
  const [perms, setPerms] = useState<string[]>(m.permissions ?? []);
  const isMember = m.role === "member";

  function toggle(key: string) {
    const next = perms.includes(key) ? perms.filter((k) => k !== key) : [...perms, key];
    setPerms(next);
    start(() => void setPermissionsAction(m.id, next));
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={m.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {m.name}
            {self && <span className="ml-2 text-xs text-text-dim">(você)</span>}
          </div>
          <div className="truncate text-xs text-text-dim">{m.email}</div>
        </div>
        <select
          value={m.role}
          disabled={self || pending}
          onChange={(e) => start(() => void setRoleAction(m.id, e.target.value))}
          className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs outline-none focus:border-accent disabled:opacity-60"
        >
          <option value="owner">Dono</option>
          <option value="admin">Admin</option>
          <option value="member">Funcionário</option>
        </select>
        <button
          disabled={self || pending}
          onClick={() => {
            if (confirm(`Remover ${m.name} da organização?`)) start(() => void removeMemberAction(m.id));
          }}
          className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10 disabled:opacity-40"
        >
          Remover
        </button>
      </div>

      {/* Delegação de funções — só faz sentido para funcionário. Owner/admin têm tudo. */}
      {isMember ? (
        <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3">
          <div className="mb-2 text-xs font-medium text-text-dim">
            Funções sob responsabilidade — marque o que {m.name.split(" ")[0]} pode acessar
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {modules.map((mod) => {
              const on = perms.includes(mod.key);
              return (
                <label
                  key={mod.key}
                  className={`flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-xs transition ${
                    on ? "border-accent bg-surface" : "border-border bg-surface hover:bg-surface-2"
                  } ${pending ? "opacity-70" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={pending}
                    onChange={() => toggle(mod.key)}
                    className="mt-0.5 accent-accent"
                  />
                  <span>
                    <span className="font-medium text-text">{mod.label}</span>
                    <span className="block text-text-dim">{mod.responsibility}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {perms.length === 0 && (
            <p className="mt-2 text-xs text-text-dim">
              Sem nenhuma função — só vê o Painel. Marque ao menos uma para dar responsabilidade.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-2 text-xs text-text-dim">Acesso total (dono/admin).</div>
      )}
    </li>
  );
}
