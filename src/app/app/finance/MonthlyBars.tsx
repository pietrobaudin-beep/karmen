"use client";

import { useState } from "react";
import { brl } from "@/lib/money";

export type MonthPoint = { label: string; income: number; expense: number };

// Barras agrupadas: Receitas (verde) x Despesas (vermelho) por mês. Um eixo só.
export function MonthlyBars({ data, tall }: { data: MonthPoint[]; tall?: boolean }) {
  const [hover, setHover] = useState<{ i: number; s: "income" | "expense" } | null>(null);

  const W = 560;
  const H = tall ? 300 : 220;
  const padL = 8;
  const padR = 8;
  const padT = 26;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseline = padT + plotH;

  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.min(20, groupW / 3);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const hasData = data.some((d) => d.income > 0 || d.expense > 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Receitas × Despesas</h2>
        <div className="flex items-center gap-3 text-xs text-text-dim">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--ok)" }} /> Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--danger)" }} /> Despesas
          </span>
        </div>
      </div>

      {!hasData ? (
        <p className="py-12 text-center text-sm text-text-dim">Sem lançamentos para o período.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: tall ? 340 : 240 }}>
          {/* grade recessiva */}
          {gridLines.map((g, i) => {
            const y = baseline - g * plotH;
            return (
              <g key={i}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth={1} />
                <text x={W - padR} y={y - 3} textAnchor="end" fontSize={9} fill="var(--text-dim)">
                  {g === 0 ? "" : brl(max * g).replace(/\s?R\$\s?/, "")}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const cx = padL + i * groupW + groupW / 2;
            const bars: { s: "income" | "expense"; v: number; x: number; color: string }[] = [
              { s: "income", v: d.income, x: cx - barW - 2, color: "var(--ok)" },
              { s: "expense", v: d.expense, x: cx + 2, color: "var(--danger)" },
            ];
            return (
              <g key={i}>
                {bars.map((b) => {
                  const h = (b.v / max) * plotH;
                  const y = baseline - h;
                  const active = hover?.i === i && hover?.s === b.s;
                  return (
                    <g key={b.s}>
                      <rect
                        x={b.x}
                        y={y}
                        width={barW}
                        height={Math.max(0, h)}
                        rx={3}
                        fill={b.color}
                        opacity={hover && !active ? 0.55 : 1}
                        onMouseEnter={() => setHover({ i, s: b.s })}
                        onMouseLeave={() => setHover(null)}
                      />
                      {active && b.v > 0 && (
                        <text x={b.x + barW / 2} y={y - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--text)">
                          {brl(b.v)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={cx} y={baseline + 16} textAnchor="middle" fontSize={10} fill="var(--text-dim)">
                  {d.label}
                </text>
              </g>
            );
          })}
          <line x1={padL} y1={baseline} x2={W - padR} y2={baseline} stroke="var(--border)" strokeWidth={1} />
        </svg>
      )}
    </div>
  );
}
