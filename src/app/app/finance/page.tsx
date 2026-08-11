import { requireModule } from "@/lib/session";
import { listFinance, financeSummary } from "@/lib/queries";
import { brl } from "@/lib/money";
import { aiEnabled } from "@/lib/ai";
import { NewEntry } from "./NewEntry";
import { FinanceRow } from "./FinanceRow";
import { ImportStatement } from "./ImportStatement";
import { MonthlyBars, type MonthPoint } from "./MonthlyBars";
import { CategoryBreakdown, type CategorySlice } from "./CategoryBreakdown";

export default async function FinancePage() {
  const { user } = await requireModule("finance");
  const [entries, summary] = await Promise.all([
    listFinance(user.orgId),
    financeSummary(user.orgId),
  ]);

  const serial = entries.map((e) => ({
    ...e,
    dueDate: e.dueDate ? new Date(e.dueDate).toISOString() : null,
  }));

  // Série mensal (últimos 6 meses): soma de receitas e despesas por mês.
  const now = new Date();
  const months: MonthPoint[] = [];
  const monthIdx = new Map<string, number>();
  for (let k = 5; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthIdx.set(key, months.length);
    months.push({
      label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      income: 0,
      expense: 0,
    });
  }
  for (const e of entries) {
    const dt = e.dueDate ? new Date(e.dueDate) : new Date(e.createdAt);
    const i = monthIdx.get(`${dt.getFullYear()}-${dt.getMonth()}`);
    if (i === undefined) continue;
    if (e.type === "income") months[i].income += e.amountCents;
    else months[i].expense += e.amountCents;
  }

  // Despesas por categoria (top 5 + "Outros").
  const catMap = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense") continue;
    const cat = e.category?.trim() || "Sem categoria";
    catMap.set(cat, (catMap.get(cat) ?? 0) + e.amountCents);
  }
  let categories: CategorySlice[] = [...catMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  if (categories.length > 6) {
    const rest = categories.slice(5).reduce((s, c) => s + c.value, 0);
    categories = [...categories.slice(0, 5), { label: "Outros", value: rest }];
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Financeiro</h1>
          <p className="text-text-dim">Receitas, despesas e o que está a pagar/receber.</p>
        </div>
        <ImportStatement enabled={true} claudeOn={aiEnabled()} />
      </header>

      {/* Gráfico como elemento principal: ganhos x gastos por mês */}
      <div className="mb-4">
        <MonthlyBars data={months} tall />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card label="Saldo" value={brl(summary.balance)} strong />
        <Card label="A receber" value={brl(summary.toReceive)} tone="ok" />
        <Card label="A pagar" value={brl(summary.toPay)} tone="danger" />
        <Card label="Recebido" value={brl(summary.incomePaid)} />
      </div>

      <div className="mb-6">
        <CategoryBreakdown data={categories} />
      </div>

      <div className="mb-6">
        <NewEntry />
      </div>

      {serial.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-dim">Nenhum lançamento ainda.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {serial.map((e) => (
            <FinanceRow key={e.id} e={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "ok" | "danger";
  strong?: boolean;
}) {
  const color = tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className={`${strong ? "text-2xl" : "text-xl"} font-semibold ${color}`}>{value}</div>
      <div className="mt-1 text-sm text-text-dim">{label}</div>
    </div>
  );
}
