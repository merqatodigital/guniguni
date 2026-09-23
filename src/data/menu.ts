import raw from "./menu.json";

export type Variant = "glass" | "bottle";
export type MenuPage = "pasta" | "pizza" | "drinks";

export interface MenuItem {
  id: string;
  name: string;
  price?: number;
  prices?: Record<Variant, number>;
  description?: string;
  vegetarian?: boolean;
}

export interface MenuSection {
  id: string;
  page: MenuPage;
  group: string;
  number?: string;
  title: string;
  subtitle?: string;
  note?: string;
  variants?: Variant[];
  items: MenuItem[];
}

export interface MenuData {
  currency: string;
  serviceChargeRate: number;
  serviceChargeNote: string;
  sections: MenuSection[];
}

export const DEFAULT_MENU = raw as MenuData;

/** Sections that have a dedicated place in the reference layouts. Others render in "More from the menu". */
export const BUILT_IN_SECTION_IDS = [
  "pasta-tagliatelle",
  "pasta-ravioli",
  "pizza",
  "burgers",
  "sides",
  "starters",
  "cocktails",
  "beers",
  "mixed-drinks",
  "wine",
  "spirits",
];

export interface IndexedItem {
  item: MenuItem;
  section: MenuSection;
}

/* ---------------- live store (admin edits + published config) ---------------- */
let current: MenuData = DEFAULT_MENU;
let index = new Map<string, IndexedItem>();
const listeners = new Set<() => void>();

function rebuild() {
  index = new Map();
  for (const section of current.sections) {
    for (const item of section.items) index.set(item.id, { item, section });
  }
}
rebuild();

export function setMenu(next: MenuData) {
  if (next === current) return;
  current = next;
  rebuild();
  // Notify after the current render pass so subscribers never set state mid-render.
  queueMicrotask(() => listeners.forEach((l) => l()));
}
export function getMenu(): MenuData {
  return current;
}
export function subscribeMenu(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function getServiceChargeRate(): number {
  return typeof current.serviceChargeRate === "number" ? current.serviceChargeRate : 0.05;
}
export function getAllItems(): IndexedItem[] {
  return Array.from(index.values());
}
export function getItem(id: string): IndexedItem | undefined {
  return index.get(id);
}

const EMPTY_SECTION: MenuSection = { id: "missing", page: "pasta", group: "", title: "", items: [] };
/** Always returns a section (an empty one if it was removed in the admin) so layouts never crash. */
export function getSection(id: string): MenuSection {
  return current.sections.find((s) => s.id === id) ?? { ...EMPTY_SECTION, id };
}

export function hasVariants(section: MenuSection): boolean {
  return Array.isArray(section.variants) && section.variants.length > 0;
}

/** Resolve the exact menu price for an item (and variant, when required). */
export function resolvePrice(item: MenuItem, variant?: Variant | null): number | null {
  if (item.prices) {
    if (!variant) return null;
    const p = item.prices[variant];
    return typeof p === "number" ? p : null;
  }
  return typeof item.price === "number" ? item.price : null;
}

export function sectionLabel(section: MenuSection): string {
  if (section.page === "pasta") return `${section.group} · ${section.title}`;
  if (section.page === "drinks") return section.title;
  return section.title === "Start Fresh" ? "Starters · Start Fresh" : section.title;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function searchItems(query: string, limit = 12): IndexedItem[] {
  const q = normalize(query.trim());
  if (!q) return [];
  const words = q.split(/\s+/);
  const scored: { entry: IndexedItem; score: number }[] = [];
  for (const entry of getAllItems()) {
    const name = normalize(entry.item.name);
    const desc = normalize(entry.item.description ?? "");
    const sec = normalize(sectionLabel(entry.section));
    let score = 0;
    for (const w of words) {
      if (name.startsWith(w)) score += 6;
      else if (name.includes(w)) score += 4;
      else if (desc.includes(w)) score += 2;
      else if (sec.includes(w)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.item.name.localeCompare(b.entry.item.name));
  return scored.slice(0, limit).map((s) => s.entry);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
