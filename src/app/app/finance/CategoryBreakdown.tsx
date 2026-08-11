import { brl } from "@/lib/money";

export type CategorySlice = { label: string; value: number };

// Barras horizontais ranqueadas (magnitude por categoria). Rótulos diretos.
export function CategoryBreakdown({ data }: { data: CategorySlice[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-3 font-medium">Despesas por categoria</h2>
      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-text-dim">Nenhuma despesa lançada.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {data.map((d) => (
            <li key={d.label} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-sm text-text-dim">{d.label}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(d.value / max) * 100}%`, background: "var(--brand)" }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-sm">{brl(d.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
