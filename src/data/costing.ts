import { uid } from "@/lib/format";
import { getMenu, hasVariants, resolvePrice, type MenuItem, type MenuSection, type Variant } from "@/data/menu";

/**
 * Private costing & recipe data.
 * Never part of the published site config — it lives in admin-only storage so it is never
 * exposed to visitors, the menu pages or the AI agent.
 */

export const UNITS = ["g", "kg", "ml", "L", "pc", "slice", "portion", "tbsp", "tsp", "cup", "pack", "can", "bottle", "shot"] as const;
export type Unit = (typeof UNITS)[number];

export interface Ingredient {
  id: string;
  name: string;
  qty: number;
  unit: Unit;
  /** Cost of ONE unit above (e.g. ₱ per gram). Optional — leave blank until inventory is set up. */
  unitCost: number;
  /** Free-text note: supplier, brand, prep. */
  note: string;
  /** Excluded from the recipe cost (garnish, staff-supplied, etc.) but kept for inventory. */
  exclude?: boolean;
}

export interface ItemCosting {
  /** Cost to us for a single-price item. */
  cost?: number;
  /** Cost to us per serving size for Glass / Bottle items. */
  costs?: Partial<Record<Variant, number>>;
  /** Recipe / bill of materials — the basis for the future inventory tool. */
  ingredients: Ingredient[];
  /** Pours per bottle, used to derive a glass cost from the bottle cost. */
  poursPerBottle?: number;
  note?: string;
  updatedAt?: string;
}

export interface CostingData {
  version: number;
  currency: string;
  updatedAt: string;
  items: Record<string, ItemCosting>;
}

export const EMPTY_COSTING: CostingData = { version: 1, currency: "PHP", updatedAt: new Date(0).toISOString(), items: {} };

export function newIngredient(): Ingredient {
  return { id: uid("ing_"), name: "", qty: 0, unit: "g", unitCost: 0, note: "" };
}

export function itemCosting(data: CostingData, itemId: string): ItemCosting {
  return data.items[itemId] ?? { ingredients: [] };
}

/** Cost built up from the recipe lines (ignores excluded lines). */
export function recipeCost(c: ItemCosting): number {
  return round2(c.ingredients.filter((i) => !i.exclude).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitCost) || 0), 0));
}

export function hasRecipeCost(c: ItemCosting): boolean {
  return c.ingredients.some((i) => !i.exclude && Number(i.qty) > 0 && Number(i.unitCost) > 0);
}

/** The cost we use for margins: the entered cost, else the recipe total. */
export function effectiveCost(c: ItemCosting, variant?: Variant | null): number | null {
  if (variant) {
    const v = c.costs?.[variant];
    if (typeof v === "number" && v > 0) return v;
    if (variant === "glass" && c.costs?.bottle && c.poursPerBottle) return round2(c.costs.bottle / c.poursPerBottle);
    return null;
  }
  if (typeof c.cost === "number" && c.cost > 0) return c.cost;
  const r = recipeCost(c);
  return r > 0 ? r : null;
}

export interface Margin {
  price: number;
  cost: number | null;
  /** Price − cost. */
  gross: number | null;
  /** Gross ÷ price. */
  marginPct: number | null;
  /** Cost ÷ price — the classic "food cost %". */
  costPct: number | null;
}

export function margin(price: number, cost: number | null): Margin {
  if (cost == null || !(price > 0)) return { price, cost, gross: null, marginPct: null, costPct: null };
  const gross = round2(price - cost);
  return { price, cost, gross, marginPct: gross / price, costPct: cost / price };
}

/** Health bands for a food/beverage business: ≤35% cost is good, ≤45% watch, above that is thin. */
export function costBand(costPct: number | null): "good" | "watch" | "thin" | "none" {
  if (costPct == null) return "none";
  if (costPct <= 0.35) return "good";
  if (costPct <= 0.45) return "watch";
  return "thin";
}

export const pct = (n: number | null, digits = 0) => (n == null ? "—" : `${(n * 100).toFixed(digits)}%`);
export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CostedLine {
  item: MenuItem;
  section: MenuSection;
  variant: Variant | null;
  label: string;
  margin: Margin;
  costing: ItemCosting;
  fromRecipe: boolean;
}

/** Every priced line on the menu (wine/spirits produce one line per serving size). */
export function costedLines(data: CostingData): CostedLine[] {
  const out: CostedLine[] = [];
  for (const section of getMenu().sections) {
    for (const item of section.items) {
      const c = itemCosting(data, item.id);
      if (hasVariants(section)) {
        for (const v of section.variants as Variant[]) {
          const price = resolvePrice(item, v);
          if (price == null) continue;
          out.push({ item, section, variant: v, label: `${item.name} (${v})`, margin: margin(price, effectiveCost(c, v)), costing: c, fromRecipe: false });
        }
      } else {
        const price = resolvePrice(item);
        if (price == null) continue;
        const entered = typeof c.cost === "number" && c.cost > 0;
        out.push({ item, section, variant: null, label: item.name, margin: margin(price, effectiveCost(c)), costing: c, fromRecipe: !entered && hasRecipeCost(c) });
      }
    }
  }
  return out;
}

export interface CostingSummary {
  total: number;
  costed: number;
  missing: number;
  withRecipe: number;
  avgCostPct: number | null;
  avgMarginPct: number | null;
  thin: CostedLine[];
}

export function summarize(lines: CostedLine[]): CostingSummary {
  const costed = lines.filter((l) => l.margin.cost != null);
  const totalPrice = costed.reduce((s, l) => s + l.margin.price, 0);
  const totalCost = costed.reduce((s, l) => s + (l.margin.cost ?? 0), 0);
  const avgCostPct = totalPrice > 0 ? totalCost / totalPrice : null;
  return {
    total: lines.length,
    costed: costed.length,
    missing: lines.length - costed.length,
    withRecipe: new Set(lines.filter((l) => l.costing.ingredients.length > 0).map((l) => l.item.id)).size,
    avgCostPct,
    avgMarginPct: avgCostPct == null ? null : 1 - avgCostPct,
    thin: costed.filter((l) => costBand(l.margin.costPct) === "thin").sort((a, b) => (b.margin.costPct ?? 0) - (a.margin.costPct ?? 0)),
  };
}

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Product-level costing sheet. */
export function costingCsv(lines: CostedLine[]): string {
  const rows = [["Section", "Item", "Item ID", "Serving", "Price PHP", "Cost PHP", "Gross profit PHP", "Cost %", "Margin %", "Cost source", "Ingredients", "Note"]];
  for (const l of lines) {
    rows.push([
      l.section.title,
      l.item.name,
      l.item.id,
      l.variant ?? "standard",
      l.margin.price.toFixed(2),
      l.margin.cost?.toFixed(2) ?? "",
      l.margin.gross?.toFixed(2) ?? "",
      l.margin.costPct != null ? (l.margin.costPct * 100).toFixed(1) : "",
      l.margin.marginPct != null ? (l.margin.marginPct * 100).toFixed(1) : "",
      l.margin.cost == null ? "not set" : l.fromRecipe ? "recipe" : "entered",
      String(l.costing.ingredients.length),
      l.costing.note ?? "",
    ]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Flat recipe lines — the seed file for the inventory tool. */
export function recipesCsv(data: CostingData): string {
  const rows = [["Item ID", "Item", "Section", "Ingredient", "Quantity", "Unit", "Unit cost PHP", "Line cost PHP", "Excluded", "Note"]];
  for (const section of getMenu().sections) {
    for (const item of section.items) {
      const c = itemCosting(data, item.id);
      for (const ing of c.ingredients) {
        rows.push([
          item.id,
          item.name,
          section.title,
          ing.name,
          String(ing.qty ?? 0),
          ing.unit,
          String(ing.unitCost ?? 0),
          (((Number(ing.qty) || 0) * (Number(ing.unitCost) || 0)) as number).toFixed(2),
          ing.exclude ? "yes" : "no",
          ing.note ?? "",
        ]);
      }
    }
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Consolidated ingredient list across the menu — the starting point for stock items. */
export function ingredientIndex(data: CostingData): { name: string; unit: string; usedIn: number; unitCost: number }[] {
  const map = new Map<string, { name: string; unit: string; usedIn: number; unitCost: number }>();
  for (const c of Object.values(data.items)) {
    for (const ing of c.ingredients) {
      const name = ing.name.trim();
      if (!name) continue;
      const key = `${name.toLowerCase()}|${ing.unit}`;
      const prev = map.get(key);
      if (prev) prev.usedIn += 1;
      else map.set(key, { name, unit: ing.unit, usedIn: 1, unitCost: Number(ing.unitCost) || 0 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.usedIn - a.usedIn || a.name.localeCompare(b.name));
}
