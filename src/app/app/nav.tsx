"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Labels } from "@/lib/labels";
import { Mark } from "@/components/Mark";
import { Avatar } from "@/components/Avatar";
import { can, type ModuleKey } from "@/lib/permissions";
import { signOutAction } from "./actions";

const COLLAPSE_KEY = "karmen_sidebar_collapsed";
const ORDER_KEY = "karmen_nav_order";

type NavItem = { href: string; label: string; icon: string; brand?: boolean; mod?: ModuleKey; adminOnly?: boolean };

export function Sidebar({
  labels,
  orgName,
  userName,
  avatarUrl,
  role,
  permissions,
}: {
  labels: Labels;
  orgName: string;
  userName: string;
  avatarUrl: string | null;
  role: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [edit, setEdit] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [dragHref, setDragHref] = useState<string | null>(null);

  // Catálogo completo (ordem padrão). O label de entidade/encontro segue a persona.
  const catalog: NavItem[] = [
    { href: "/app", label: "Painel", icon: "◉" },
    { href: "/app/agenda", label: "Agenda", icon: "▦", mod: "agenda" },
    { href: "/app/encounters", label: labels.sessionPlural, icon: "▤", mod: "encounters" },
    { href: "/app/tasks", label: "Tarefas", icon: "✓", mod: "tasks" },
    { href: "/app/finance", label: "Financeiro", icon: "$", mod: "finance" },
    { href: "/app/team", label: "Time", icon: "◎", adminOnly: true },
    { href: "/app/entities", label: labels.entityPlural, icon: "◍", mod: "entities" },
    { href: "/app/chat", label: "Chat", icon: "◈", mod: "chat" },
    { href: "/app/assistant", label: "Karmen AI", icon: "✦", brand: true, mod: "assistant" },
    { href: "/app/admin", label: "Admin", icon: "⛨", adminOnly: true },
  ];

  // Mostra só o que a pessoa pode acessar: owner/admin veem tudo; funcionário
  // vê o Painel + os módulos que o dono delegou a ele.
  const me = { role, permissions };
  const allItems: NavItem[] = catalog.filter((it) => {
    if (it.adminOnly) return role !== "member";
    if (it.mod) return can(me, it.mod);
    return true; // Painel
  });

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    const saved = localStorage.getItem(ORDER_KEY);
    if (saved) {
      try {
        setOrder(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Ordem efetiva: a salva (só hrefs válidos) + qualquer item novo ao final.
  const validHrefs = allItems.map((i) => i.href);
  const kept = order.filter((h) => validHrefs.includes(h));
  const missing = validHrefs.filter((h) => !kept.includes(h));
  const orderedHrefs = [...kept, ...missing];
  const items = orderedHrefs.map((h) => allItems.find((i) => i.href === h)!);

  function persistOrder(next: string[]) {
    setOrder(next);
    localStorage.setItem(ORDER_KEY, JSON.stringify(next));
  }

  function reorder(fromHref: string, toHref: string) {
    if (fromHref === toHref) return;
    const arr = [...orderedHrefs];
    const from = arr.indexOf(fromHref);
    const to = arr.indexOf(toHref);
    if (from < 0 || to < 0) return;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
    persistOrder(arr);
  }

  function resetOrder() {
    persistOrder(validHrefs);
  }

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      if (next) setEdit(false); // não editar recolhido
      return next;
    });
  }

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col self-start border-r border-border bg-surface p-3 transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Cabeçalho: apenas o símbolo K (sem wordmark) */}
      <div className={`mb-6 ${collapsed ? "px-0" : "px-1"}`}>
        <Link href="/app" aria-label="KARMEN" className="block">
          <Mark className={`text-brand ${collapsed ? "mx-auto h-6 w-6" : "h-7 w-7"}`} />
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {edit && !collapsed && (
          <p className="mb-1 px-1 text-xs text-text-dim">Arraste para reorganizar</p>
        )}

        {items.map((it) => {
          if (edit && !collapsed) {
            // Modo edição: item arrastável (não navega).
            return (
              <div
                key={it.href}
                draggable
                onDragStart={() => setDragHref(it.href)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragHref && dragHref !== it.href) reorder(dragHref, it.href);
                }}
                onDragEnd={() => setDragHref(null)}
                className={`flex cursor-grab items-center gap-2.5 rounded-lg border border-dashed px-3 py-2 text-sm active:cursor-grabbing ${
                  dragHref === it.href ? "border-brand bg-surface-2 opacity-50" : "border-border bg-surface-2/40"
                }`}
              >
                <span className="text-text-dim">⠿</span>
                <span className={`w-4 text-center ${it.brand ? "text-brand" : "opacity-70"}`}>{it.icon}</span>
                <span className="truncate">{it.label}</span>
              </div>
            );
          }

          const active = it.href === "/app" ? pathname === "/app" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              title={collapsed ? it.label : undefined}
              className={`flex items-center gap-2.5 rounded-lg py-2 text-sm transition ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${active ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface-2 hover:text-text"}`}
            >
              <span className={`w-4 text-center ${it.brand ? "text-brand" : "opacity-70"}`}>{it.icon}</span>
              {!collapsed && <span className="truncate">{it.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé: recolher · editar barra · conta (perfil) · sair */}
      <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Expandir" : "Recolher"}
          className={`flex items-center gap-2.5 rounded-lg py-2 text-sm text-text-dim transition hover:bg-surface-2 hover:text-text ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
        >
          <span className="w-4 text-center">{collapsed ? "»" : "«"}</span>
          {!collapsed && <span>Recolher</span>}
        </button>

        {!collapsed && (
          <>
            <button
              onClick={() => setEdit((e) => !e)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                edit ? "bg-brand/10 text-brand" : "text-text-dim hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="w-4 text-center">{edit ? "✓" : "⠿"}</span>
              <span className="truncate">{edit ? "Concluir edição" : "Editar barra de ferramentas"}</span>
            </button>
            {edit && (
              <button
                onClick={resetOrder}
                className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-text-dim transition hover:bg-surface-2 hover:text-text"
              >
                <span className="w-4 text-center">↺</span>
                <span>Restaurar padrão</span>
              </button>
            )}
          </>
        )}

        <Link
          href="/app/settings"
          title={collapsed ? userName : "Configurações"}
          className={`flex items-center gap-2.5 rounded-lg py-2 transition hover:bg-surface-2 ${
            collapsed ? "justify-center px-0" : "px-2"
          } ${pathname.startsWith("/app/settings") ? "bg-surface-2" : ""}`}
        >
          <Avatar name={userName} src={avatarUrl} size={collapsed ? 26 : 32} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{userName}</div>
              <div className="truncate text-xs text-text-dim">{orgName}</div>
            </div>
          )}
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            title="Sair"
            className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-left text-sm text-text-dim transition hover:bg-surface-2 hover:text-text ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <span className="w-4 text-center">⎋</span>
            {!collapsed && <span>Sair</span>}
          </button>
        </form>
      </div>
    </aside>
  );
}
