import { sentences, looksLikeAction, toTaskTitle } from "./text";

// Resumo local de um encontro (sem IA externa): resumo extrativo + tarefas
// derivadas de frases de ação. Simples, mas útil e 100% offline.
export function localSummarize(notesText: string): { summary: string; tasks: string[] } {
  const clean = notesText.trim();
  if (!clean) return { summary: "Sem anotações para resumir.", tasks: [] };

  const sents = sentences(clean);

  // Tarefas: frases que parecem ações. Dedup por texto normalizado.
  const seen = new Set<string>();
  const tasks: string[] = [];
  for (const s of sents) {
    if (looksLikeAction(s)) {
      const title = toTaskTitle(s);
      const key = title.toLowerCase();
      if (title.length > 3 && !seen.has(key)) {
        seen.add(key);
        tasks.push(title);
      }
    }
    if (tasks.length >= 8) break;
  }

  // Resumo: primeiras frases informativas (até ~3), limitado a ~400 chars.
  let summary = "";
  for (const s of sents) {
    if (summary.length + s.length > 400) break;
    summary += (summary ? " " : "") + s;
    if (summary.length > 220) break;
  }
  if (!summary) summary = clean.slice(0, 300);

  const note =
    tasks.length > 0
      ? `${summary}\n\n(Resumo local — ${tasks.length} tarefa(s) sugerida(s).)`
      : `${summary}\n\n(Resumo local.)`;

  return { summary: note, tasks };
}
