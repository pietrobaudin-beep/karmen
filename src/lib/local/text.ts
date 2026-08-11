// Helpers de texto puros (sem dependência externa) para os motores locais.

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function sentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Verbos/expressões que indicam ação → viram tarefas de follow-up.
const ACTION_HINTS = [
  "enviar",
  "envie",
  "mandar",
  "mande",
  "agendar",
  "agende",
  "marcar",
  "marque",
  "ligar",
  "ligue",
  "cobrar",
  "cobre",
  "revisar",
  "revise",
  "preparar",
  "prepare",
  "entregar",
  "entregue",
  "confirmar",
  "confirme",
  "retornar",
  "retorne",
  "responder",
  "responda",
  "combinar",
  "combine",
  "verificar",
  "verifique",
  "checar",
  "definir",
  "defina",
  "contratar",
  "pagar",
  "orcamento",
  "proposta",
  "follow",
  "acompanhar",
  "retomar",
  "levar",
  "trazer",
  "fazer",
  "criar",
  "montar",
  "escrever",
  "atualizar",
  "próximo passo",
  "proximo passo",
  "próximos passos",
  "proximos passos",
  "preciso",
  "precisa",
  "tem que",
  "temos que",
  "vou",
  "vamos",
  "ficou de",
  "ficamos de",
  "pendente",
  "a fazer",
  "todo",
];

export function looksLikeAction(sentence: string): boolean {
  const n = normalize(sentence);
  if (/^[-*•]/.test(sentence.trim())) return true; // bullet
  return ACTION_HINTS.some((h) => n.includes(normalize(h)));
}

// Limpa uma frase de ação para virar título de tarefa.
export function toTaskTitle(sentence: string): string {
  let t = sentence.trim().replace(/^[-*•]\s*/, "");
  t = t.replace(/^(preciso|precisa|temos que|tem que|vou|vamos|ficou de|ficamos de)\s+/i, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.slice(0, 140);
}
