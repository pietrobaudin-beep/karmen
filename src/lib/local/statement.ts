import { normalize } from "./text";

export interface ParsedEntry {
  type: "income" | "expense";
  description: string;
  amountReais: number;
  category: string | null;
  date: string | null; // ISO yyyy-mm-dd
}

// ------------------------------ CSV helpers ------------------------------

function detectDelimiter(sample: string): string {
  const cands = [";", ",", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of cands) {
    const count = (sample.match(new RegExp(`\\${d}`, "g")) ?? []).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function splitRow(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (c === delim && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const DATE_RE = /(\d{4}-\d{2}-\d{2})|(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/;

function parseDate(raw: string): string | null {
  const m = raw.match(DATE_RE);
  if (!m) return null;
  const s = m[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[/.-]/).map((p) => p.trim());
  if (parts.length !== 3) return null;
  let [d, mo, y] = parts; // assume dd/mm/yyyy (pt-BR)
  if (y.length === 2) y = "20" + y;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  if (Number(mm) > 12) return null;
  return `${y}-${mm}-${dd}`;
}

// Retorna valor com sinal (negativo = saída). null se não for número.
function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const neg = /^\(.*\)$/.test(raw.trim()) || raw.includes("-") || /\bd\b/i.test(raw);
  let str = raw.replace(/[^\d.,]/g, "");
  if (!str || !/\d/.test(str)) return null;
  const lastDot = str.lastIndexOf(".");
  const lastComma = str.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // o separador decimal é o que aparece por último
    if (lastComma > lastDot) str = str.replace(/\./g, "").replace(",", ".");
    else str = str.replace(/,/g, "");
  } else if (lastComma >= 0) {
    str = str.replace(",", ".");
  }
  const n = Number.parseFloat(str);
  if (Number.isNaN(n)) return null;
  return neg ? -Math.abs(n) : Math.abs(n);
}

// ------------------------------ categorização ------------------------------

const CATEGORY_MAP: [string, string][] = [
  ["salario", "Salário"],
  ["folha", "Folha de pagamento"],
  ["aluguel", "Aluguel"],
  ["energia", "Energia"],
  ["luz ", "Energia"],
  ["agua", "Água"],
  ["internet", "Telecom"],
  ["telefon", "Telecom"],
  ["imposto", "Impostos"],
  ["tribut", "Impostos"],
  ["darf", "Impostos"],
  ["das ", "Impostos"],
  ["fornecedor", "Fornecedores"],
  ["tarifa", "Tarifas bancárias"],
  ["taxa", "Tarifas bancárias"],
  ["cartao", "Cartão"],
  ["mercado", "Mercado"],
  ["supermerc", "Mercado"],
  ["combustivel", "Combustível"],
  ["posto", "Combustível"],
  ["assinatura", "Assinaturas"],
  ["transfer", "Transferência"],
  ["pix", "Pix"],
  ["honorario", "Honorários"],
  ["consultoria", "Serviços"],
  ["servico", "Serviços"],
  ["mensalidade", "Mensalidade"],
];

function inferCategory(description: string): string | null {
  const n = normalize(description);
  for (const [kw, cat] of CATEGORY_MAP) if (n.includes(kw)) return cat;
  return null;
}

// ------------------------------ parser principal ------------------------------

export function localParseStatement(text: string): ParsedEntry[] {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delim = detectDelimiter(lines.slice(0, 5).join("\n"));
  const rows = lines.map((l) => splitRow(l, delim));
  const cols = Math.max(...rows.map((r) => r.length));
  if (cols < 2) return [];

  // A primeira linha é cabeçalho se não tiver número monetário em nenhuma coluna.
  const firstHasAmount = rows[0].some((c) => parseAmount(c) !== null && /\d/.test(c));
  const dataRows = firstHasAmount ? rows : rows.slice(1);

  // Descobre índices por amostragem: coluna de data, de valor e de descrição.
  const score = { date: new Array(cols).fill(0), amount: new Array(cols).fill(0), textLen: new Array(cols).fill(0) };
  for (const r of dataRows.slice(0, 40)) {
    for (let i = 0; i < cols; i++) {
      const v = r[i] ?? "";
      if (parseDate(v)) score.date[i]++;
      if (parseAmount(v) !== null && /\d/.test(v) && !parseDate(v)) score.amount[i]++;
      if (!parseAmount(v) && !parseDate(v)) score.textLen[i] += v.length;
    }
  }
  const argmax = (a: number[]) => a.indexOf(Math.max(...a));
  const dateIdx = Math.max(...score.date) > 0 ? argmax(score.date) : -1;
  const amountIdx = argmax(score.amount);
  const descIdx = argmax(score.textLen);

  const entries: ParsedEntry[] = [];
  for (const r of dataRows) {
    const amount = parseAmount(r[amountIdx] ?? "");
    if (amount === null || amount === 0) continue;
    const description = (r[descIdx] ?? r.find((c) => c && !parseAmount(c) && !parseDate(c)) ?? "Lançamento").slice(
      0,
      200,
    );
    const date = dateIdx >= 0 ? parseDate(r[dateIdx] ?? "") : null;
    entries.push({
      type: amount < 0 ? "expense" : "income",
      description,
      amountReais: Math.abs(amount),
      category: inferCategory(description),
      date,
    });
  }
  return entries;
}

export function isProbablyCsv(text: string): boolean {
  const head = text.slice(0, 2000);
  return /[;,\t|]/.test(head) && /\d/.test(head);
}
