import { getMenu, hasVariants, resolvePrice, type MenuPage, type Variant } from "@/data/menu";
import { effectiveCost, round2, type CostingData } from "@/data/costing";

export type PeriodKind = "week" | "lastWeek" | "month" | "lastMonth" | "ytd" | "custom";
export type Bucket = "day" | "week" | "month";
export type Channel = "food" | "beverage";

export interface Period {
  kind: PeriodKind;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  label: string;
}

export interface Kpis {
  sales: number;
  cost: number;
  net: number;
  costPct: number | null;
  marginPct: number | null;
  units: number;
  covers: number;
  avgCheck: number | null;
  serviceCharge: number;
  foodSales: number;
  foodCost: number;
  bevSales: number;
  bevCost: number;
}

export interface SeriesPoint {
  key: string;
  label: string;
  from: Date;
  to: Date;
  sales: number;
  cost: number;
  net: number;
  units: number;
}

export interface CategoryRow {
  id: string;
  title: string;
  channel: Channel;
  sales: number;
  cost: number;
  net: number;
  units: number;
  costPct: number | null;
}

export interface ProductRow {
  itemId: string;
  name: string;
  section: string;
  channel: Channel;
  variant: Variant | null;
  qty: number;
  sales: number;
  cost: number;
  net: number;
  costPct: number | null;
}

export interface FinanceReport {
  period: Period;
  kpis: Kpis;
  prev: Kpis;
  series: SeriesPoint[];
  categories: CategoryRow[];
  products: ProductRow[];
  mock: true;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
}
function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  return addDays(x, day === 0 ? -6 : 1 - day);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

export function periodFor(kind: PeriodKind, customFrom?: string, customTo?: string, now = new Date()): Period {
  const today = startOfDay(now);
  const fmt = (a: Date, b: Date) =>
    a.getTime() === b.getTime()
      ? a.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
      : `${a.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${b.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;

  if (kind === "week") {
    const from = mondayOf(today);
    const to = today;
    const prevTo = addDays(from, -1);
    const prevFrom = mondayOf(prevTo);
    return { kind, from, to, prevFrom, prevTo, label: `This week · ${fmt(from, to)}` };
  }
  if (kind === "lastWeek") {
    const thisMon = mondayOf(today);
    const from = addDays(thisMon, -7);
    const to = addDays(thisMon, -1);
    const prevFrom = addDays(from, -7);
    const prevTo = addDays(from, -1);
    return { kind, from, to, prevFrom, prevTo, label: `Last week · ${fmt(from, to)}` };
  }
  if (kind === "month") {
    const from = startOfMonth(today);
    const to = today;
    const prevTo = addDays(from, -1);
    const prevFrom = startOfMonth(prevTo);
    return { kind, from, to, prevFrom, prevTo, label: `This month · ${fmt(from, to)}` };
  }
  if (kind === "lastMonth") {
    const thisStart = startOfMonth(today);
    const to = addDays(thisStart, -1);
    const from = startOfMonth(to);
    const prevTo = addDays(from, -1);
    const prevFrom = startOfMonth(prevTo);
    return { kind, from, to, prevFrom, prevTo, label: `Last month · ${fmt(from, to)}` };
  }
  if (kind === "ytd") {
    const from = startOfYear(today);
    const to = today;
    const prevFrom = startOfYear(new Date(today.getFullYear() - 1, 0, 1));
    const prevTo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    return { kind, from, to, prevFrom, prevTo, label: `Year to date · ${fmt(from, to)}` };
  }
  const from = customFrom ? startOfDay(new Date(customFrom + "T00:00:00")) : addDays(today, -29);
  let to = customTo ? startOfDay(new Date(customTo + "T00:00:00")) : today;
  if (to < from) to = from;
  const span = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(span - 1));
  return { kind: "custom", from, to, prevFrom, prevTo, label: `Custom · ${fmt(from, to)}` };
}

export function changePct(now: number, prev: number): number | null {
  if (prev === 0) return now === 0 ? 0 : null;
  return (now - prev) / prev;
}

export function bucketFor(kind: PeriodKind, from: Date, to: Date): Bucket {
  const n = daysBetween(from, to) + 1;
  if (kind === "ytd" || n > 90) return "month";
  if (kind === "week" || kind === "lastWeek" || n <= 14) return "day";
  return "week";
}

/* ----------------------------- mock daily sales ----------------------------- */
/** Deterministic 0–1 from a string (stable across sessions). */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

interface CatalogLine {
  itemId: string;
  name: string;
  section: string;
  page: MenuPage;
  channel: Channel;
  variant: Variant | null;
  price: number;
  popularity: number;
}

function catalog(): CatalogLine[] {
  const out: CatalogLine[] = [];
  for (const section of getMenu().sections) {
    const channel: Channel = section.page === "drinks" ? "beverage" : "food";
    const popBase =
      section.id === "cocktails" || section.id === "beers"
        ? 1.35
        : section.id === "pizza" || section.id === "pasta-tagliatelle"
          ? 1.2
          : section.id === "sides"
            ? 1.1
            : section.id === "spirits"
              ? 0.55
              : 0.85;
    for (const item of section.items) {
      if (hasVariants(section)) {
        for (const v of section.variants as Variant[]) {
          const price = resolvePrice(item, v);
          if (price == null) continue;
          out.push({ itemId: item.id, name: item.name, section: section.title, page: section.page, channel, variant: v, price, popularity: v === "bottle" ? popBase * 0.18 : popBase });
        }
      } else {
        const price = resolvePrice(item);
        if (price == null) continue;
        out.push({ itemId: item.id, name: item.name, section: section.title, page: section.page, channel, variant: null, price, popularity: popBase });
      }
    }
  }
  return out;
}

function qtyFor(line: CatalogLine, day: Date): number {
  const dow = day.getDay(); // 0 Sun
  const weekend = dow === 0 || dow === 5 || dow === 6 ? 1.45 : 1;
  const monthBoost = day.getMonth() === 11 ? 1.25 : day.getMonth() === 3 || day.getMonth() === 4 ? 1.12 : 1; // Dec peak, Apr–May
  const rain = hash01(`rain-${isoDay(day)}`) > 0.78 ? 0.82 : 1;
  const noise = 0.65 + hash01(`${line.itemId}|${line.variant ?? "x"}|${isoDay(day)}`) * 0.7;
  const base =
    line.channel === "beverage"
      ? line.variant === "bottle"
        ? 0.35
        : 5.2
      : line.section === "Sides"
        ? 6.5
        : line.section === "Pizza"
          ? 3.8
          : line.section === "Tagliatelle"
            ? 3.4
            : line.section === "Burgers"
              ? 2.6
              : 1.8;
  const raw = base * line.popularity * weekend * monthBoost * rain * noise;
  return Math.max(0, Math.round(raw));
}

function emptyKpis(): Kpis {
  return { sales: 0, cost: 0, net: 0, costPct: null, marginPct: null, units: 0, covers: 0, avgCheck: null, serviceCharge: 0, foodSales: 0, foodCost: 0, bevSales: 0, bevCost: 0 };
}

function finish(k: Kpis, serviceRate: number): Kpis {
  k.sales = round2(k.sales);
  k.cost = round2(k.cost);
  k.net = round2(k.sales - k.cost);
  k.costPct = k.sales > 0 ? k.cost / k.sales : null;
  k.marginPct = k.sales > 0 ? k.net / k.sales : null;
  k.serviceCharge = round2(k.sales * serviceRate);
  k.foodSales = round2(k.foodSales);
  k.foodCost = round2(k.foodCost);
  k.bevSales = round2(k.bevSales);
  k.bevCost = round2(k.bevCost);
  k.covers = Math.max(1, Math.round(k.units / 2.4));
  k.avgCheck = k.covers > 0 ? round2(k.sales / k.covers) : null;
  return k;
}

function addSale(k: Kpis, channel: Channel, sales: number, cost: number, qty: number) {
  k.sales += sales;
  k.cost += cost;
  k.units += qty;
  if (channel === "food") {
    k.foodSales += sales;
    k.foodCost += cost;
  } else {
    k.bevSales += sales;
    k.bevCost += cost;
  }
}

function eachDay(from: Date, to: Date, fn: (d: Date) => void) {
  for (let d = startOfDay(from); d <= to; d = addDays(d, 1)) fn(d);
}

function seriesKey(d: Date, bucket: Bucket): { key: string; label: string; from: Date; to: Date } {
  if (bucket === "day") {
    return { key: isoDay(d), label: d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" }), from: d, to: d };
  }
  if (bucket === "week") {
    const from = mondayOf(d);
    const to = addDays(from, 6);
    return { key: isoDay(from), label: `W/c ${from.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`, from, to };
  }
  const from = startOfMonth(d);
  const to = endOfMonth(d);
  return { key: `${from.getFullYear()}-${pad(from.getMonth() + 1)}`, label: from.toLocaleDateString("en-PH", { month: "short", year: "numeric" }), from, to };
}

export function buildReport(costing: CostingData, period: Period, serviceRate = 0.05): FinanceReport {
  const items = catalog();
  const bucket = bucketFor(period.kind, period.from, period.to);

  const kpis = emptyKpis();
  const prev = emptyKpis();
  const catMap = new Map<string, CategoryRow>();
  const prodMap = new Map<string, ProductRow>();
  const seriesMap = new Map<string, SeriesPoint>();

  const costOf = (itemId: string, variant: Variant | null) => {
    const c = costing.items[itemId];
    if (!c) return 0;
    return effectiveCost(c, variant) ?? 0;
  };

  const consume = (day: Date, target: Kpis, trackDetail: boolean) => {
    for (const line of items) {
      const qty = qtyFor(line, day);
      if (qty <= 0) continue;
      const sales = line.price * qty;
      const cost = costOf(line.itemId, line.variant) * qty;
      addSale(target, line.channel, sales, cost, qty);
      if (!trackDetail) continue;

      const cat = catMap.get(line.section) ?? { id: line.section, title: line.section, channel: line.channel, sales: 0, cost: 0, net: 0, units: 0, costPct: null };
      cat.sales += sales;
      cat.cost += cost;
      cat.units += qty;
      catMap.set(line.section, cat);

      const pk = `${line.itemId}:${line.variant ?? ""}`;
      const pr = prodMap.get(pk) ?? { itemId: line.itemId, name: line.name, section: line.section, channel: line.channel, variant: line.variant, qty: 0, sales: 0, cost: 0, net: 0, costPct: null };
      pr.qty += qty;
      pr.sales += sales;
      pr.cost += cost;
      prodMap.set(pk, pr);

      const sk = seriesKey(day, bucket);
      const sp = seriesMap.get(sk.key) ?? { key: sk.key, label: sk.label, from: sk.from, to: sk.to, sales: 0, cost: 0, net: 0, units: 0 };
      sp.sales += sales;
      sp.cost += cost;
      sp.units += qty;
      seriesMap.set(sk.key, sp);
    }
  };

  eachDay(period.from, period.to, (d) => consume(d, kpis, true));
  eachDay(period.prevFrom, period.prevTo, (d) => consume(d, prev, false));

  finish(kpis, serviceRate);
  finish(prev, serviceRate);

  const categories = Array.from(catMap.values())
    .map((c) => ({ ...c, sales: round2(c.sales), cost: round2(c.cost), net: round2(c.sales - c.cost), costPct: c.sales > 0 ? c.cost / c.sales : null }))
    .sort((a, b) => b.sales - a.sales);

  const products = Array.from(prodMap.values())
    .map((p) => ({ ...p, sales: round2(p.sales), cost: round2(p.cost), net: round2(p.sales - p.cost), costPct: p.sales > 0 ? p.cost / p.sales : null }))
    .sort((a, b) => b.sales - a.sales);

  const series = Array.from(seriesMap.values())
    .map((s) => ({ ...s, sales: round2(s.sales), cost: round2(s.cost), net: round2(s.sales - s.cost) }))
    .sort((a, b) => a.from.getTime() - b.from.getTime());

  return { period, kpis, prev, series, categories, products, mock: true };
}

export function financeCsv(report: FinanceReport): string {
  const cell = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: string[][] = [["Period", report.period.label], ["From", isoDay(report.period.from)], ["To", isoDay(report.period.to)], []];
  rows.push(["Section", "Channel", "Units", "Sales PHP", "Cost PHP", "Net PHP", "Cost %"]);
  for (const c of report.categories) {
    rows.push([c.title, c.channel, String(c.units), c.sales.toFixed(2), c.cost.toFixed(2), c.net.toFixed(2), c.costPct != null ? (c.costPct * 100).toFixed(1) : ""]);
  }
  rows.push([]);
  rows.push(["Item", "Serving", "Section", "Units", "Sales PHP", "Cost PHP", "Net PHP", "Cost %"]);
  for (const p of report.products) {
    rows.push([p.name, p.variant ?? "standard", p.section, String(p.qty), p.sales.toFixed(2), p.cost.toFixed(2), p.net.toFixed(2), p.costPct != null ? (p.costPct * 100).toFixed(1) : ""]);
  }
  return rows.map((r) => r.map(cell).join(",")).join("\n");
}
