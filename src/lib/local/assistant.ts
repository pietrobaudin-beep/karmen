import "server-only";
import {
  listTasks,
  listEncounters,
  listEntities,
  createTask,
  financeSummary,
  searchNotes,
} from "@/lib/queries";
import { brl } from "@/lib/money";
import type { Labels } from "@/lib/labels";
import { normalize } from "./text";

// Karmen AI em modo local: interpreta a pergunta por palavras-chave e responde
// com dados reais da org. Sem chamada a nenhuma API externa.
export async function localAssistant(
  orgId: string,
  userId: string,
  labels: Labels,
  message: string,
): Promise<string> {
  const q = normalize(message);

  // 1) Criar tarefa: "cria/adiciona (uma) tarefa: X"
  const createMatch = message.match(
    /(?:cri[ae]r?|adicion[ae]r?|nova tarefa|anot[ae]r?)\s+(?:uma\s+)?(?:tarefa\s*[:-]?\s*)?(.+)/i,
  );
  if (createMatch && /tarefa|lembr|fazer/.test(q)) {
    let title = createMatch[1].trim().replace(/^tarefa\s*[:-]?\s*/i, "");
    title = title.replace(/\s+(pro|para|pra)\s+.+$/i, (m) => m); // mantém "pro fulano"
    if (title.length > 2) {
      await createTask(orgId, { title: title.slice(0, 140), createdBy: userId });
      return `Pronto — criei a tarefa: "${title.slice(0, 140)}". Você pode vê-la no quadro de Tarefas.`;
    }
  }

  // 2) Tarefas atrasadas
  if (/atrasad|vencid|em atraso|passou do prazo/.test(q)) {
    const rows = await listTasks(orgId);
    const now = new Date();
    const overdue = rows.filter(
      (t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now,
    );
    if (overdue.length === 0) return "Nenhuma tarefa atrasada. 👍";
    return (
      `Você tem ${overdue.length} tarefa(s) atrasada(s):\n` +
      overdue
        .map((t) => `• ${t.title} (venceu ${new Date(t.dueDate!).toLocaleDateString("pt-BR")}${t.assigneeName ? `, ${t.assigneeName}` : ""})`)
        .join("\n")
    );
  }

  // 3) Financeiro
  if (/financ|saldo|receber|a pagar|fatur|receita|despesa|caixa|dinheiro|quanto.*(ganhei|gastei)/.test(q)) {
    const s = await financeSummary(orgId);
    return (
      `Resumo financeiro:\n` +
      `• Saldo: ${brl(s.balance)}\n` +
      `• A receber: ${brl(s.toReceive)}\n` +
      `• A pagar: ${brl(s.toPay)}\n` +
      `• Já recebido: ${brl(s.incomePaid)} · já pago: ${brl(s.expensePaid)}`
    );
  }

  // 4) Tarefas (lista geral)
  if (/tarefa|a fazer|pendente|kanban/.test(q)) {
    const rows = await listTasks(orgId);
    const open = rows.filter((t) => t.status !== "done");
    if (open.length === 0) return "Nenhuma tarefa aberta no momento.";
    return (
      `Você tem ${open.length} tarefa(s) aberta(s):\n` +
      open
        .slice(0, 15)
        .map((t) => `• ${t.title}${t.assigneeName ? ` — ${t.assigneeName}` : ""}${t.priority === "high" ? " [alta]" : ""}`)
        .join("\n")
    );
  }

  // 5) Encontros / agenda
  if (/encontro|reuni|sess|aula|atendimento|agenda|calendario|proxim/.test(q)) {
    const rows = await listEncounters(orgId);
    if (rows.length === 0) return `Nenhum(a) ${labels.session.toLowerCase()} registrado(a) ainda.`;
    return (
      `${labels.sessionPlural} recentes:\n` +
      rows
        .slice(0, 10)
        .map(
          (e) =>
            `• ${e.title}${e.entityName ? ` (${e.entityName})` : ""} — ${new Date(e.occurredAt).toLocaleDateString("pt-BR")}`,
        )
        .join("\n")
    );
  }

  // 6) Contagem / lista de entidades
  const entPlural = normalize(labels.entityPlural);
  const entSing = normalize(labels.entity);
  if (
    /quant[oa]s?/.test(q) &&
    (q.includes(entPlural) || q.includes(entSing) || /client|paciente|aluno|contato|entidade/.test(q))
  ) {
    const rows = await listEntities(orgId);
    return `Você tem ${rows.length} ${labels.entityPlural.toLowerCase()} cadastrado(s).`;
  }
  if (q.includes(entPlural) || q.includes(entSing) || /client|paciente|aluno|contato|list/.test(q)) {
    const rows = await listEntities(orgId);
    if (rows.length === 0) return `Nenhum(a) ${labels.entity.toLowerCase()} cadastrado(a) ainda.`;
    return (
      `${labels.entityPlural} (${rows.length}):\n` + rows.slice(0, 20).map((e) => `• ${e.name}`).join("\n")
    );
  }

  // 7) Busca em notas: "sobre X" / "procura X"
  const searchMatch = message.match(/(?:sobre|procur[ae]r?|busc[ae]r?|encontr[ae]r?|o que.*sobre)\s+(.+)/i);
  if (searchMatch) {
    const term = searchMatch[1].replace(/[?.!]/g, "").trim();
    const rows = await searchNotes(orgId, term, 6);
    if (rows.length === 0) return `Não encontrei anotações sobre "${term}".`;
    return (
      `Encontrei ${rows.length} anotação(ões) sobre "${term}":\n` +
      rows.map((r) => `• [${new Date(r.createdAt).toLocaleDateString("pt-BR")}] ${r.body.slice(0, 160)}`).join("\n")
    );
  }

  // 8) Ajuda
  return (
    "Sou a Karmen (modo local). Posso responder sobre seus dados. Tente:\n" +
    "• Quais tarefas estão atrasadas?\n" +
    "• Como está o financeiro? / Quanto tenho a receber?\n" +
    `• Liste os ${labels.sessionPlural.toLowerCase()} recentes\n` +
    `• Quantos ${labels.entityPlural.toLowerCase()} eu tenho?\n` +
    "• Cria uma tarefa: revisar proposta\n" +
    "• Sobre <assunto> (busca nas anotações)"
  );
}
