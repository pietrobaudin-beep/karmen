"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type CalItem = {
  date: string; // ISO
  kind: "encounter" | "task" | "finance";
  tone: "brand" | "ok" | "danger" | "neutral";
  icon: string;
  label: string;
  href: string;
  done?: boolean;
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TONE: Record<CalItem["tone"], string> = {
  brand: "bg-brand/15 text-brand",
  ok: "bg-ok/15 text-ok",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-surface-2 text-text-dim",
};

function ymd(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({
  items,
  onDayClick,
}: {
  items: CalItem[];
  onDayClick?: (dateISO: string) => void;
}) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) {
      const d = new Date(it.date);
      const key = ymd(d);
      const arr = map.get(key);
      if (arr) arr.push(it);
      else map.set(key, [it]);
    }
    return map;
  }, [items]);

  const first = new Date(view.y, view.m, 1);
  const startWeekday = first.getDay();
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - startWeekday + i));

  const title = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-medium capitalize">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView({ y: today.getFullYear(), m: today.getMonth() })}
            className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-surface-2"
          >
            Hoje
          </button>
          <button onClick={() => shift(-1)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface-2">
            ‹
          </button>
          <button onClick={() => shift(1)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface-2">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-xs font-medium text-text-dim">
            {w}
          </div>
        ))}

        {cells.map((d, i) => {
          const inMonth = d.getMonth() === view.m;
          const isToday = ymd(d) === ymd(today);
          const dayItems = byDay.get(ymd(d)) ?? [];
          return (
            <div
              key={i}
              onClick={onDayClick ? () => onDayClick(isoDate(d)) : undefined}
              title={onDayClick ? "Adicionar neste dia" : undefined}
              className={`group flex min-h-[92px] flex-col gap-1 rounded-lg border p-1.5 ${
                onDayClick ? "cursor-pointer hover:border-brand/40" : ""
              } ${inMonth ? "border-border bg-surface" : "border-transparent bg-surface-2/30"}`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center self-start rounded-full text-xs ${
                  isToday ? "bg-brand font-semibold text-brand-fg" : inMonth ? "text-text" : "text-text-dim/60"
                }`}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayItems.slice(0, 3).map((it, k) => (
                  <Link
                    key={k}
                    href={it.href}
                    title={it.label}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] leading-tight transition hover:opacity-80 ${TONE[it.tone]} ${
                      it.done ? "line-through opacity-60" : ""
                    }`}
                  >
                    <span className="shrink-0 opacity-80">{it.icon}</span>
                    <span className="truncate">{it.label}</span>
                  </Link>
                ))}
                {dayItems.length > 3 && (
                  <span className="px-1 text-[11px] text-text-dim">+{dayItems.length - 3} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-text-dim">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand/60" /> Encontros
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-surface-2" /> Tarefas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-ok/60" /> A receber
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-danger/60" /> A pagar
        </span>
      </div>
    </div>
  );
}
