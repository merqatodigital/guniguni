import type { SiteConfig } from "@/data/site";
import { uid } from "@/lib/format";
import { getMenu } from "@/data/menu";
import { effectiveCost, ingredientIndex, round2, type CostingData } from "@/data/costing";
import { MOCK_COSTING, isEmptyCosting } from "@/data/mockCosting";
import { buildReport, isoDay, periodFor, type PeriodKind } from "@/data/finance";
import { peso } from "@/lib/format";
import type { Order } from "@/lib/backend";

export type Audience = "guest" | "staff";
export type SkillId = "guest-host" | "guest-order" | "finance" | "brief" | "inventory" | "floor";
export type TaskWhen = "morning" | "afternoon" | "on-demand";

export interface SkillDef {
  id: SkillId;
  audience: Audience;
  label: string;
  blurb: string;
  enabled: boolean;
}

export interface AgentTask {
  id: string;
  title: string;
  when: TaskWhen;
  skill: SkillId;
  instructions: string;
  enabled: boolean;
}

export const DEFAULT_SKILLS: SkillDef[] = [
  { id: "guest-host", audience: "guest", label: "Guest host", blurb: "Answer guests about dishes, drinks, prices, vegetarian options, hours and the place.", enabled: true },
  { id: "guest-order", audience: "guest", label: "Table ordering", blurb: "Walk guests through adding items, Glass vs Bottle, table number and paying at the counter.", enabled: true },
  { id: "finance", audience: "staff", label: "Financials", blurb: "Sales, cost of goods, net, food/bev %, weekly / monthly / YTD.", enabled: true },
  { id: "brief", audience: "staff", label: "Shift briefs", blurb: "Morning and afternoon briefings for the floor and kitchen.", enabled: true },
  { id: "inventory", audience: "staff", label: "Inventory", blurb: "Ingredient usage from recipes, mock on-hand and low-stock flags (until a stock system is connected).", enabled: true },
  { id: "floor", audience: "staff", label: "Floor & orders", blurb: "Open table orders, 86 list, what to fire next.", enabled: true },
];

export const DEFAULT_TASKS: AgentTask[] = [
  {
    id: "task-am",
    title: "Morning briefing",
    when: "morning",
    skill: "brief",
    enabled: true,
    instructions:
      "Write a morning briefing for the opening team. Cover: yesterday vs the week, today's hours and happy hour, 86'd items, low-stock ingredients to prep or order, the five dishes likely to sell, and one hospitality note. Keep it under 250 words, scannable bullets.",
  },
  {
    id: "task-pm",
    title: "Afternoon briefing",
    when: "afternoon",
    skill: "brief",
    enabled: true,
    instructions:
      "Write an afternoon briefing before happy hour (4–7pm). Cover: today so far vs yesterday, covers and average check, what is 86'd, spirits/wine that are moving, and a reminder to push cocktails. Short bullets.",
  },
  {
    id: "task-finance",
    title: "Numbers check",
    when: "on-demand",
    skill: "finance",
    enabled: true,
    instructions:
      "Summarise this week, this month and YTD: sales, COGS, net, food cost %, beverage cost %, top 5 products by sales and any items with cost % above 45%. Flag anything that needs a price or recipe look.",
  },
  {
    id: "task-stock",
    title: "Low-stock walk",
    when: "on-demand",
    skill: "inventory",
    enabled: true,
    instructions:
      "List ingredients that are low or out, what dishes they affect, and a suggested par. Group by kitchen vs bar.",
  },
  {
    id: "task-86",
    title: "86 board",
    when: "on-demand",
    skill: "floor",
    enabled: true,
    instructions:
      "Read the 86 list and open orders. Tell the floor what not to sell and which tables are waiting.",
  },
];

export function mergeSkills(saved?: Partial<SkillDef>[]): SkillDef[] {
  return DEFAULT_SKILLS.map((d) => {
    const s = saved?.find((x) => x.id === d.id);
    return s ? { ...d, enabled: s.enabled !== false } : d;
  });
}

export function skillOn(skills: SkillDef[] | undefined, id: SkillId): boolean {
  return mergeSkills(skills).some((s) => s.id === id && s.enabled);
}

/* ------------------------------ live snapshots ------------------------------ */
function compactFinance(costing: CostingData): string {
  const kinds: PeriodKind[] = ["week", "month", "ytd"];
  const lines: string[] = [];
  for (const k of kinds) {
    const r = buildReport(costing, periodFor(k), 0.05);
    const foodPct = r.kpis.foodSales > 0 ? `${((r.kpis.foodCost / r.kpis.foodSales) * 100).toFixed(1)}%` : "—";
    const bevPct = r.kpis.bevSales > 0 ? `${((r.kpis.bevCost / r.kpis.bevSales) * 100).toFixed(1)}%` : "—";
    lines.push(
      `${r.period.label}: sales ${peso(r.kpis.sales)}, COGS ${peso(r.kpis.cost)}, net ${peso(r.kpis.net)}, cost ${r.kpis.costPct != null ? (r.kpis.costPct * 100).toFixed(1) : "—"}%, food cost ${foodPct}, bev cost ${bevPct}, covers ${r.kpis.covers}, avg check ${r.kpis.avgCheck != null ? peso(r.kpis.avgCheck) : "—"}.`,
    );
    if (k === "week") {
      lines.push("Top sellers this week: " + r.products.slice(0, 5).map((p) => `${p.name}${p.variant ? ` (${p.variant})` : ""} ${p.qty}u ${peso(p.sales)}`).join("; "));
      const thin = r.products.filter((p) => (p.costPct ?? 0) > 0.45).slice(0, 5);
      if (thin.length) lines.push("High cost %: " + thin.map((p) => `${p.name} ${((p.costPct ?? 0) * 100).toFixed(0)}%`).join("; "));
    }
  }
  return lines.join("\n");
}

function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export interface StockRow {
  name: string;
  unit: string;
  usedIn: number;
  unitCost: number;
  par: number;
  onHand: number;
  status: "ok" | "low" | "out";
}

export function stockSnapshot(costing: CostingData): StockRow[] {
  return ingredientIndex(costing)
    .filter((i) => i.name.trim())
    .map((i) => {
      const par = Math.max(4, Math.round(i.usedIn * 18));
      const wave = hash01(`stock-${i.name}-${i.unit}`);
      const onHand = Math.max(0, Math.round(par * (0.05 + wave * 1.15)));
      const status: StockRow["status"] = onHand <= 0 ? "out" : onHand < par * 0.35 ? "low" : "ok";
      return { name: i.name, unit: i.unit, usedIn: i.usedIn, unitCost: i.unitCost, par, onHand, status };
    });
}

function compactInventory(costing: CostingData): string {
  const rows = stockSnapshot(costing);
  const low = rows.filter((r) => r.status !== "ok");
  const okN = rows.length - low.length;
  const lines = [`${rows.length} ingredients on the recipe book · ${okN} healthy · ${low.filter((r) => r.status === "low").length} low · ${low.filter((r) => r.status === "out").length} out. Mock on-hand until a stock system is connected.`];
  for (const r of low.slice(0, 18)) {
    lines.push(`- ${r.name} (${r.unit}): ${r.onHand} on hand / par ${r.par} · ${r.status.toUpperCase()} · used in ${r.usedIn} products · ${peso(r.unitCost)}/${r.unit}`);
  }
  return lines.join("\n");
}

function compactOrders(orders: Order[], unavailable: string[]): string {
  const open = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const lines = [`Open orders: ${open.length}. 86'd item ids: ${unavailable.length ? unavailable.join(", ") : "none"}.`];
  const names = new Map(getMenu().sections.flatMap((s) => s.items.map((i) => [i.id, i.name] as const)));
  if (unavailable.length) lines.push("86 board: " + unavailable.map((id) => names.get(id) ?? id).join(", "));
  for (const o of open.slice(0, 12)) {
    lines.push(`- ${o.number} table ${o.tableNumber} ${o.status} ${peso(o.total)} · ${o.lines.map((l) => `${l.qty}× ${l.name}${l.variant ? ` (${l.variant})` : ""}`).join(", ")}${o.lines.some((l) => l.notes) ? " · notes yes" : ""}`);
  }
  return lines.join("\n");
}

function compactRecipes(costing: CostingData): string {
  const lines: string[] = [];
  for (const section of getMenu().sections) {
    for (const item of section.items) {
      const c = costing.items[item.id];
      if (!c) continue;
      const cost = effectiveCost(c, section.variants?.[0] ?? null);
      const ings = c.ingredients
        .filter((i) => i.name.trim())
        .slice(0, 8)
        .map((i) => `${i.qty}${i.unit} ${i.name}`)
        .join(", ");
      lines.push(`- ${item.name}: cost ${cost != null ? peso(round2(cost)) : "—"}${ings ? ` · ${ings}` : ""}`);
    }
  }
  return lines.slice(0, 80).join("\n");
}

export interface OpsContext {
  costing?: CostingData | null;
  orders?: Order[];
  unavailable?: string[];
  skills?: SkillDef[];
  tasks?: AgentTask[];
}

export const GUEST_SKILL_BLOCK = `PERSONA AND TONE:
You are the funny, witty, and charismatic virtual host of GUNI GUNI Bistro in Palawan, Philippines.
Be fun, playful, and entertaining with clever bistro banter and witty observations (like carbs curing bad days, cheese being essential, or Palawan sunshine making food taste better), but ALWAYS keep every single detail completely informative and accurate. Never be dry, robotic, or overly stiff.

CRITICAL FORMATTING RULES:
- NO SYMBOLS OR MARKDOWN FORMATTING: Do NOT use asterisks (** or *), do NOT use markdown headers (###), do NOT use bullet dashes (- or * or •) at the start of lines, do NOT use backticks, and do NOT use underscores.
- NO EMOJIS: Do not use any emojis or decorative symbols.
- Output clean, natural, readable plain text only with standard line breaks. When listing items, put each on its own clean line without dashes or asterisks. Always write prices cleanly with ₱ or PHP, like ₱320.

KNOWLEDGE AND SKILLS:
- Food and drinks: dishes, exact prices in Philippine pesos, vegetarian leaf marks, Glass vs Bottle for wine and spirits, what is in a dish (from the menu descriptions only).
- Ordering: guests tap a dish on the menu, set quantity and notes, enter their table number and pay at the counter. A 5% service charge is added. You cannot take card payments or invent add-on prices (pizza add-ons: ask the server).
- Place: hours (7:00 AM to 10:00 PM), happy hour (4:00 PM to 7:00 PM), address in Puerto Princesa, phone (+63 917 771 3992), adults-only hostel note.
- Never discuss internal food costs, recipes, wages, inventory, or financial numbers with guests. If you do not know something, say so playfully and suggest asking a server.`;

export function buildOpsPrompt(site: SiteConfig, ctx: OpsContext): string {
  const costing = !ctx.costing || isEmptyCosting(ctx.costing) ? MOCK_COSTING : ctx.costing;
  const skills = mergeSkills(ctx.skills ?? site.agent.skills);
  const tasks = (ctx.tasks ?? site.agent.tasks ?? DEFAULT_TASKS).filter((t) => t.enabled);
  const on = (id: SkillId) => skills.some((s) => s.id === id && s.enabled);

  const parts: string[] = [
    `You are the GUNI GUNI Bistro operations copilot for staff (not guests). Today is ${isoDay(new Date())}. Be concise, numeric, and honest about mock vs live data. Never invent ₱ figures that contradict LIVE DATA below.`,
    `Restaurant: ${site.header.brand} ${site.header.brandSub}. ${site.footer.location.hours}. Happy hour: ${site.footer.location.happyHour}. Phone ${site.footer.contact.phone}.`,
    `Enabled skills: ${skills.filter((s) => s.enabled).map((s) => s.label).join(", ") || "none"}.`,
  ];

  if (tasks.length) {
    parts.push("STANDING TASKS:\n" + tasks.map((t) => `- [${t.when}] ${t.title} (${t.skill}): ${t.instructions}`).join("\n"));
  }
  if (on("finance")) parts.push("LIVE FINANCIALS (mock covers × recipe costs):\n" + compactFinance(costing));
  if (on("inventory")) parts.push("LIVE INVENTORY (mock on-hand from recipes):\n" + compactInventory(costing));
  if (on("floor")) parts.push("LIVE FLOOR:\n" + compactOrders(ctx.orders ?? [], ctx.unavailable ?? []));
  if (on("finance") || on("inventory")) parts.push("RECIPE COSTS:\n" + compactRecipes(costing));

  const kb = site.agent.knowledge.map((k) => `### ${k.name}\n${k.text}`).join("\n\n");
  if (kb) parts.push("KNOWLEDGE FILES:\n" + kb.slice(0, 20_000));

  parts.push(
    "If a skill is disabled, say so and offer the closest enabled skill. For guests you would send them to the public Ask-us host — you are staff-only.\n\nFORMAT RULES: Do NOT use markdown symbols (no asterisks **, no bullet dashes -, no markdown headers). Do NOT use emojis. Write clean, natural plain text with clean line breaks.",
  );
  return parts.join("\n\n");
}

export function cannedPrompt(task: AgentTask): string {
  return `Run the standing task “${task.title}” now.\n\n${task.instructions}`;
}

export function newTask(): AgentTask {
  return {
    id: uid("task_"),
    title: "New task",
    when: "on-demand",
    skill: "brief",
    enabled: true,
    instructions: "Describe what the copilot should produce.",
  };
}
