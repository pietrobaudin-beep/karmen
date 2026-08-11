// Sistema de permissões por módulo.
// Dono (owner) e admin têm acesso total. Funcionário (member) só acessa/atua
// nos módulos que o dono DELEGOU — ele fica "responsável" por aquela função.

export type ModuleKey =
  | "agenda"
  | "encounters"
  | "tasks"
  | "finance"
  | "entities"
  | "chat"
  | "assistant";

export interface ModuleDef {
  key: ModuleKey;
  href: string;
  /** Label padrão (alguns são relabelados pela persona na UI). */
  label: string;
  icon: string;
  /** Curadoria do que a pessoa passa a poder fazer ao receber o módulo. */
  responsibility: string;
}

// Módulos que o dono pode delegar. Painel (/app) é sempre visível;
// Admin é exclusivo de owner/admin e não entra aqui.
export const MODULES: ModuleDef[] = [
  { key: "agenda", href: "/app/agenda", label: "Agenda", icon: "▦", responsibility: "Ver e organizar o calendário" },
  { key: "encounters", href: "/app/encounters", label: "Reuniões", icon: "▤", responsibility: "Registrar e conduzir reuniões" },
  { key: "tasks", href: "/app/tasks", label: "Tarefas", icon: "✓", responsibility: "Criar e tocar tarefas" },
  { key: "finance", href: "/app/finance", label: "Financeiro", icon: "$", responsibility: "Lançar receitas, despesas e cobranças" },
  { key: "entities", href: "/app/entities", label: "Contatos", icon: "◍", responsibility: "Gerir clientes e contatos" },
  { key: "chat", href: "/app/chat", label: "Chat", icon: "◈", responsibility: "Conversar com o time" },
  { key: "assistant", href: "/app/assistant", label: "Karmen AI", icon: "✦", responsibility: "Usar a IA sobre os dados" },
];

export const MODULE_KEYS = MODULES.map((m) => m.key);

export function isModuleKey(v: string): v is ModuleKey {
  return (MODULE_KEYS as string[]).includes(v);
}

// Normaliza qualquer valor persistido (jsonb) numa lista limpa de módulos.
export function sanitizePermissions(input: unknown): ModuleKey[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<ModuleKey>();
  for (const v of input) if (typeof v === "string" && isModuleKey(v)) out.add(v);
  return [...out];
}

// Fonte da verdade: o funcionário pode acessar o módulo?
export function can(
  user: { role: string; permissions?: string[] | null },
  moduleKey: ModuleKey,
): boolean {
  if (user.role === "owner" || user.role === "admin") return true;
  return (user.permissions ?? []).includes(moduleKey);
}

// Novos funcionários começam SEM nenhuma função — o dono precisa delegar.
export const DEFAULT_MEMBER_PERMISSIONS: ModuleKey[] = [];
