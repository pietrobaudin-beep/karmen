// Presets de persona: mapeiam "que tipo de empresa é a sua?" nos labels do
// substrato comum. Foco: empresas (pequenas, médias e grandes). Adicionar um
// tipo novo = adicionar uma entrada aqui (sem tocar no schema).

export type PersonaType = "small_business" | "medium_business" | "enterprise" | "generic";

export interface PersonaPreset {
  type: PersonaType;
  displayName: string;
  emoji: string;
  tagline: string;
  entityLabel: string;
  entityLabelPlural: string;
  sessionLabel: string;
  sessionLabelPlural: string;
  noteLabel: string;
  taskLabel: string;
  enabledFields: Record<string, boolean>;
  // Exemplos usados como placeholders/seed para popular o cérebro rápido.
  sampleEntityNames: string[];
}

export const PERSONA_PRESETS: Record<PersonaType, PersonaPreset> = {
  small_business: {
    type: "small_business",
    displayName: "Pequena empresa",
    emoji: "🏪",
    tagline: "Clientes, reuniões e finanças da operação num só lugar.",
    entityLabel: "Cliente",
    entityLabelPlural: "Clientes",
    sessionLabel: "Reunião",
    sessionLabelPlural: "Reuniões",
    noteLabel: "Ata",
    taskLabel: "Tarefa",
    enabledFields: { entityCompany: true, entityContact: true },
    sampleEntityNames: ["Acme Ltda", "Padaria Norte"],
  },
  medium_business: {
    type: "medium_business",
    displayName: "Média empresa",
    emoji: "🏢",
    tagline: "Times, clientes e projetos coordenados sem caos de ferramenta.",
    entityLabel: "Cliente",
    entityLabelPlural: "Clientes",
    sessionLabel: "Reunião",
    sessionLabelPlural: "Reuniões",
    noteLabel: "Ata",
    taskLabel: "Tarefa",
    enabledFields: { entityCompany: true, entityContact: true },
    sampleEntityNames: ["Grupo Vega", "Studio Norte"],
  },
  enterprise: {
    type: "enterprise",
    displayName: "Grande empresa",
    emoji: "🏭",
    tagline: "Departamentos, contas e operações em escala, com controle de acesso.",
    entityLabel: "Conta",
    entityLabelPlural: "Contas",
    sessionLabel: "Reunião",
    sessionLabelPlural: "Reuniões",
    noteLabel: "Ata",
    taskLabel: "Tarefa",
    enabledFields: { entityCompany: true, entityContact: true, entityDepartment: true },
    sampleEntityNames: ["Conta Corporativa A", "Conta Corporativa B"],
  },
  generic: {
    type: "generic",
    displayName: "Empresa (uso geral)",
    emoji: "⚡",
    tagline: "Clientes, encontros e tarefas — flexível.",
    entityLabel: "Cliente",
    entityLabelPlural: "Clientes",
    sessionLabel: "Reunião",
    sessionLabelPlural: "Reuniões",
    noteLabel: "Nota",
    taskLabel: "Tarefa",
    enabledFields: { entityCompany: true },
    sampleEntityNames: ["Cliente exemplo"],
  },
};

export const PERSONA_LIST = Object.values(PERSONA_PRESETS);

export function getPreset(type: string): PersonaPreset {
  return PERSONA_PRESETS[(type as PersonaType)] ?? PERSONA_PRESETS.generic;
}

// Catálogo de tipos de empresa. Todos disponíveis (o foco do produto agora).
export interface Profession {
  key: string;
  label: string;
  emoji: string;
  personaType: PersonaType | null;
}

export const PROFESSIONS: Profession[] = [
  { key: "small_business", label: "Pequena empresa", emoji: "🏪", personaType: "small_business" },
  { key: "medium_business", label: "Média empresa", emoji: "🏢", personaType: "medium_business" },
  { key: "enterprise", label: "Grande empresa", emoji: "🏭", personaType: "enterprise" },
  { key: "generic", label: "Empresa (uso geral)", emoji: "⚡", personaType: "generic" },
];
