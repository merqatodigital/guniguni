import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { getMenu, hasVariants, resolvePrice, type MenuItem, type MenuSection, type Variant } from "@/data/menu";
import {
  EMPTY_COSTING,
  UNITS,
  costBand,
  costedLines,
  costingCsv,
  effectiveCost,
  hasRecipeCost,
  ingredientIndex,
  itemCosting,
  margin,
  newIngredient,
  pct,
  recipeCost,
  recipesCsv,
  round2,
  summarize,
  type CostingData,
  type Ingredient,
  type ItemCosting,
  type Unit,
} from "@/data/costing";
import { peso } from "@/lib/format";
import { downloadText } from "@/lib/media";
import { Icon } from "@/components/ui";
import { MOCK_COSTING, isEmptyCosting } from "@/data/mockCosting";
import { FinanceView } from "./financeView";
import { Btn, Field, Grid, Panel, StatusDot, TextArea, useAdminToken } from "./fields";

const BAND_CLS = { good: "text-leaf", watch: "text-amber-600", thin: "text-red-600", none: "text-muted" } as const;
const BAND_LABEL = { good: "Healthy", watch: "Watch", thin: "Thin", none: "No cost yet" } as const;

export function CostingPanel() {
  const { backend, mode, toast } = useApp();
  const token = useAdminToken();
  const [data, setData] = useState<CostingData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "missing" | "thin" | "recipes">("all");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"finance" | "recipes">("finance");

  useEffect(() => {
    if (!backend) return;
    let alive = true;
    backend
      .getCosting(token)
      .then((d) => alive && setData(isEmptyCosting(d) ? MOCK_COSTING : d))
      .catch((e) => {
        if (!alive) return;
        setData(EMPTY_COSTING);
        setError(e instanceof Error ? e.message : "Could not load the costing sheet.");
      });
    return () => {
      alive = false;
    };
  }, [backend, token]);

  const update = useCallback((itemId: string, patch: Partial<ItemCosting>) => {
    setData((d) => {
      if (!d) return d;
      const prev = d.items[itemId] ?? { ingredients: [] };
      return { ...d, items: { ...d.items, [itemId]: { ...prev, ...patch, updatedAt: new Date().toISOString() } } };
    });
    setDirty(true);
  }, []);

  const save = async () => {
    if (!backend || !data) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await backend.saveCosting(token, { ...data, updatedAt: new Date().toISOString() });
      setData(saved);
      setDirty(false);
      toast("Costing saved (private — not published to the website).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const lines = useMemo(() => (data ? costedLines(data) : []), [data]);
  const stats = useMemo(() => summarize(lines), [lines]);
  const menu = getMenu();

  if (!data) return <Panel title="Costs & recipes">{error ? <p className="text-[13px] text-red-700">{error}</p> : <p className="text-[13px] text-muted">Loading costing sheet…</p>}</Panel>;

  const matches = (item: MenuItem, section: MenuSection) => {
    const q = query.trim().toLowerCase();
    if (q && !`${item.name} ${section.title}`.toLowerCase().includes(q)) return false;
    const c = itemCosting(data, item.id);
    const dual = hasVariants(section);
    const costed = dual ? !!effectiveCost(c, "glass") || !!effectiveCost(c, "bottle") : effectiveCost(c) != null;
    if (filter === "missing") return !costed;
    if (filter === "recipes") return c.ingredients.length > 0;
    if (filter === "thin") {
      const prices = dual ? (section.variants as Variant[]).map((v) => ({ v, p: resolvePrice(item, v) })) : [{ v: null as Variant | null, p: resolvePrice(item) }];
      return prices.some(({ v, p }) => p != null && costBand(margin(p, effectiveCost(c, v)).costPct) === "thin");
    }
    return true;
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setTab("finance")} className={cn("rounded-full px-4 py-2 text-[13px] font-medium", tab === "finance" ? "bg-ink text-cream" : "bg-ink/5 hover:bg-ink/10")}>
          Financials
        </button>
        <button type="button" onClick={() => setTab("recipes")} className={cn("rounded-full px-4 py-2 text-[13px] font-medium", tab === "recipes" ? "bg-ink text-cream" : "bg-ink/5 hover:bg-ink/10")}>
          Costs & recipes
        </button>
      </div>

      {tab === "finance" && <FinanceView costing={data} />}

      {tab === "recipes" && (
        <>
        <Panel
        title="Costs & recipes"
        blurb="Your cost per dish and per drink, the gross profit it leaves, and the ingredient list behind it. This data is private: it is stored separately from the published site, never appears on the menu pages and is never given to the AI assistant."
        actions={
          <>
            <StatusDot state={dirty ? "warn" : "ok"} label={dirty ? "Unsaved changes" : `Saved ${data.updatedAt && new Date(data.updatedAt).getFullYear() > 1971 ? new Date(data.updatedAt).toLocaleString() : "—"}`} />
            <Btn variant="primary" onClick={save} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save costing"}
            </Btn>
          </>
        }
      >
        {error && (
          <p role="alert" className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            {error}
          </p>
        )}
        <Grid cols={4}>
          <Metric label="Priced lines" value={String(stats.total)} note={`${stats.withRecipe} with a recipe`} />
          <Metric label="Costed" value={`${stats.costed}/${stats.total}`} note={stats.missing ? `${stats.missing} still need a cost` : "all products costed"} state={stats.missing ? "warn" : "ok"} />
          <Metric label="Average food/bev cost" value={pct(stats.avgCostPct, 1)} note="weighted by menu price" state={costBand(stats.avgCostPct) === "good" ? "ok" : costBand(stats.avgCostPct) === "none" ? "idle" : "warn"} />
          <Metric label="Average gross margin" value={pct(stats.avgMarginPct, 1)} note="before service charge & overheads" state={stats.avgMarginPct != null && stats.avgMarginPct >= 0.6 ? "ok" : "idle"} />
        </Grid>
        {stats.thin.length > 0 && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-3">
            <p className="text-[12.5px] font-semibold text-red-800">{stats.thin.length} product{stats.thin.length === 1 ? "" : "s"} above 45% cost:</p>
            <p className="mt-1 text-[12px] text-red-800/90">
              {stats.thin
                .slice(0, 8)
                .map((l) => `${l.label} (${pct(l.margin.costPct)})`)
                .join(" · ")}
              {stats.thin.length > 8 ? " …" : ""}
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "missing", "thin", "recipes"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1.5 text-[12.5px]", filter === f ? "bg-ink text-cream" : "bg-ink/5 hover:bg-ink/10")}>
              {f === "all" ? "All products" : f === "missing" ? `Missing cost (${stats.missing})` : f === "thin" ? `Thin margin (${stats.thin.length})` : `With recipe (${stats.withRecipe})`}
            </button>
          ))}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products…" className="ml-auto min-w-[200px] rounded-full border border-ink/20 bg-white/70 px-3 py-1.5 text-[12.5px] outline-none focus:border-ink" aria-label="Search products" />
        </div>
        {mode === "demo" && <p className="mt-3 rounded-xl border border-yellow bg-yellow/20 px-3 py-2 text-[12px]">Demo mode: costing is stored in this browser only. Export the CSVs below to keep a copy.</p>}
      </Panel>

      {menu.sections.map((section) => {
        const items = section.items.filter((i) => matches(i, section));
        if (items.length === 0) return null;
        const dual = hasVariants(section);
        return (
          <Panel key={section.id} title={section.title} blurb={`${section.group ? `${section.group} · ` : ""}${items.length} product${items.length === 1 ? "" : "s"}${dual ? " · glass & bottle costs" : ""}`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="kicker text-left text-muted">
                    <th className="pb-2 pr-2 font-medium">Product</th>
                    <th className="pb-2 pr-2 font-medium">Price</th>
                    <th className="pb-2 pr-2 font-medium">Cost to us</th>
                    <th className="pb-2 pr-2 font-medium">Gross profit</th>
                    <th className="pb-2 pr-2 font-medium">Cost %</th>
                    <th className="pb-2 pr-2 font-medium">Margin</th>
                    <th className="pb-2 font-medium">Recipe</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <CostRow
                      key={item.id}
                      item={item}
                      section={section}
                      costing={itemCosting(data, item.id)}
                      expanded={open === item.id}
                      onToggle={() => setOpen(open === item.id ? null : item.id)}
                      onChange={(patch) => update(item.id, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}

      <Panel title="Ingredient index" blurb="Every ingredient used across the menu, ready to become stock items when the inventory tool is added.">
        <IngredientIndexTable data={data} />
      </Panel>

      <Panel title="Export" blurb="Spreadsheet-ready copies of your costing sheet and recipe lines.">
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => downloadText(`guni-guni-costing-${new Date().toISOString().slice(0, 10)}.csv`, costingCsv(lines), "text/csv")}>
            <Icon.Download size={14} /> Product costing CSV
          </Btn>
          <Btn onClick={() => downloadText(`guni-guni-recipes-${new Date().toISOString().slice(0, 10)}.csv`, recipesCsv(data), "text/csv")}>
            <Icon.Download size={14} /> Recipes / ingredients CSV
          </Btn>
          <Btn onClick={() => downloadText(`guni-guni-costing-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2))}>
            <Icon.Download size={14} /> Costing JSON (backup)
          </Btn>
        </div>
        <p className="mt-3 text-[11.5px] text-muted">
          Gross profit = menu price − cost to us. It excludes the 5% service charge, VAT, labour and overheads, so treat it as product-level margin only.
        </p>
      </Panel>
      </>
      )}
    </>
  );
}

function Metric({ label, value, note, state = "idle" }: { label: string; value: string; note: string; state?: "ok" | "warn" | "bad" | "idle" }) {
  return (
    <div className="rounded-xl border border-line bg-white/50 p-4">
      <p className="kicker text-muted">{label}</p>
      <p className="cond mt-1 text-[26px] leading-none">{value}</p>
      <p className="mt-2 text-[11px]">
        <StatusDot state={state} label={note} />
      </p>
    </div>
  );
}

const cell = "w-full rounded-md border border-ink/15 bg-white/70 px-2 py-1.5 outline-none focus:border-ink";

function CostRow({
  item,
  section,
  costing,
  expanded,
  onToggle,
  onChange,
}: {
  item: MenuItem;
  section: MenuSection;
  costing: ItemCosting;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ItemCosting>) => void;
}) {
  const dual = hasVariants(section);
  const recipe = recipeCost(costing);
  const usesRecipe = !dual && !(typeof costing.cost === "number" && costing.cost > 0) && hasRecipeCost(costing);

  const rows: { variant: Variant | null; price: number }[] = dual
    ? (section.variants as Variant[]).map((v) => ({ variant: v, price: resolvePrice(item, v) ?? 0 }))
    : [{ variant: null, price: resolvePrice(item) ?? 0 }];

  return (
    <>
      <tr className="border-t border-line align-top">
        <td className="py-2 pr-2">
          <button type="button" onClick={onToggle} className="text-left" aria-expanded={expanded}>
            <span className="font-medium">{item.name}</span>
            {item.vegetarian && <span className="ml-1 text-leaf">·</span>}
            <span className="ml-2 text-[11px] text-muted">{costing.ingredients.length ? `${costing.ingredients.length} ingredient${costing.ingredients.length === 1 ? "" : "s"}` : "no recipe yet"}</span>
          </button>
        </td>
        <td colSpan={6} className="py-2">
          <div className="space-y-1.5">
            {rows.map(({ variant, price }) => {
              const cost = effectiveCost(costing, variant);
              const m = margin(price, cost);
              const band = costBand(m.costPct);
              return (
                <div key={variant ?? "std"} className="grid grid-cols-[70px_110px_100px_70px_1fr] items-center gap-2">
                  <span className="tabular-nums">{peso(price)}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-muted">₱</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={variant ? (costing.costs?.[variant] ?? "") : (costing.cost ?? "")}
                      placeholder={variant ? (variant === "glass" && costing.costs?.bottle && costing.poursPerBottle ? String(round2(costing.costs.bottle / costing.poursPerBottle)) : "0.00") : usesRecipe ? String(recipe) : "0.00"}
                      onChange={(e) => {
                        const v = e.target.value === "" ? undefined : Number(e.target.value);
                        if (variant) onChange({ costs: { ...costing.costs, [variant]: v } });
                        else onChange({ cost: v });
                      }}
                      className={cn(cell, "tabular-nums")}
                      aria-label={`Cost to us for ${item.name}${variant ? ` per ${variant}` : ""}`}
                    />
                  </span>
                  <span className={cn("tabular-nums", m.gross != null && m.gross <= 0 && "text-red-600")}>{m.gross != null ? peso(m.gross) : "—"}</span>
                  <span className={cn("tabular-nums font-medium", BAND_CLS[band])}>{pct(m.costPct, 1)}</span>
                  <span className="flex items-center gap-2 text-[11.5px]">
                    <span className={cn("font-medium", BAND_CLS[band])}>
                      {pct(m.marginPct, 1)} {BAND_LABEL[band]}
                    </span>
                    {variant && <span className="rounded bg-ink/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">{variant}</span>}
                    {!variant && usesRecipe && <span className="rounded bg-yellow/60 px-1.5 py-0.5 text-[10px]">from recipe</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-line/60 bg-cream-2/40">
          <td colSpan={7} className="px-2 py-3">
            <RecipeEditor item={item} dual={dual} costing={costing} onChange={onChange} />
          </td>
        </tr>
      )}
    </>
  );
}

function RecipeEditor({ item, dual, costing, onChange }: { item: MenuItem; dual: boolean; costing: ItemCosting; onChange: (patch: Partial<ItemCosting>) => void }) {
  const recipe = recipeCost(costing);
  const setIngredients = (ingredients: Ingredient[]) => onChange({ ingredients });
  const patchIng = (id: string, patch: Partial<Ingredient>) => setIngredients(costing.ingredients.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="kicker text-muted">Recipe / bill of materials — {item.name}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px]">
            Recipe cost: <strong className="tabular-nums">{peso(recipe)}</strong>
          </span>
          {!dual && recipe > 0 && (
            <Btn small onClick={() => onChange({ cost: recipe })} title="Copy the recipe total into the cost field">
              Use as cost
            </Btn>
          )}
        </div>
      </div>

      {costing.ingredients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">No ingredients yet. Add the components and quantities — unit costs can be filled in later when inventory goes live.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="kicker text-left text-muted">
                <th className="pb-1 pr-2 font-medium">Ingredient</th>
                <th className="pb-1 pr-2 font-medium">Qty</th>
                <th className="pb-1 pr-2 font-medium">Unit</th>
                <th className="pb-1 pr-2 font-medium">₱ / unit</th>
                <th className="pb-1 pr-2 font-medium">Line cost</th>
                <th className="pb-1 pr-2 font-medium">Note</th>
                <th className="pb-1 font-medium" />
              </tr>
            </thead>
            <tbody>
              {costing.ingredients.map((ing) => (
                <tr key={ing.id} className={cn("border-t border-line/70", ing.exclude && "opacity-55")}>
                  <td className="py-1.5 pr-2">
                    <input value={ing.name} onChange={(e) => patchIng(ing.id, { name: e.target.value })} placeholder="e.g. Tagliatelle dough" className={cn(cell, "min-w-[150px]")} aria-label="Ingredient name" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min={0} step="0.01" value={ing.qty || ""} onChange={(e) => patchIng(ing.id, { qty: Number(e.target.value) })} className={cn(cell, "w-[76px] tabular-nums")} aria-label="Quantity" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <select value={ing.unit} onChange={(e) => patchIng(ing.id, { unit: e.target.value as Unit })} className={cn(cell, "w-[86px]")} aria-label="Unit">
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min={0} step="0.01" value={ing.unitCost || ""} onChange={(e) => patchIng(ing.id, { unitCost: Number(e.target.value) })} placeholder="0.00" className={cn(cell, "w-[86px] tabular-nums")} aria-label="Cost per unit" />
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{peso(round2((Number(ing.qty) || 0) * (Number(ing.unitCost) || 0)))}</td>
                  <td className="py-1.5 pr-2">
                    <input value={ing.note} onChange={(e) => patchIng(ing.id, { note: e.target.value })} placeholder="supplier / brand / prep" className={cn(cell, "min-w-[140px]")} aria-label="Note" />
                  </td>
                  <td className="whitespace-nowrap py-1.5">
                    <button type="button" onClick={() => patchIng(ing.id, { exclude: !ing.exclude })} className="rounded-full p-1.5 hover:bg-ink/10" title={ing.exclude ? "Include in recipe cost" : "Exclude from recipe cost"} aria-pressed={!!ing.exclude}>
                      <Icon.Eye size={13} />
                    </button>
                    <button type="button" onClick={() => setIngredients(costing.ingredients.filter((x) => x.id !== ing.id))} className="rounded-full p-1.5 text-red-700 hover:bg-red-50" aria-label="Delete ingredient">
                      <Icon.Trash size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Btn small onClick={() => setIngredients([...costing.ingredients, newIngredient()])}>
          <Icon.Plus size={13} /> Add ingredient
        </Btn>
        {dual && (
          <Field label="Pours per bottle" hint="Used to derive the glass cost from the bottle cost">
            <input
              type="number"
              min={1}
              step="1"
              value={costing.poursPerBottle ?? ""}
              onChange={(e) => onChange({ poursPerBottle: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="e.g. 16"
              className={cn(cell, "w-[110px] tabular-nums")}
            />
          </Field>
        )}
        <Field label="Internal note" className="min-w-[240px] flex-1">
          <TextArea value={costing.note ?? ""} onChange={(v) => onChange({ note: v })} rows={1} placeholder="Yield, prep notes, supplier terms…" />
        </Field>
      </div>
    </div>
  );
}

function IngredientIndexTable({ data }: { data: CostingData }) {
  const rows = ingredientIndex(data);
  const [q, setQ] = useState("");
  const list = q.trim() ? rows.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase())) : rows;
  if (rows.length === 0) return <p className="text-[13px] text-muted">No ingredients yet — add them to any product above.</p>;
  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">
          {rows.length} distinct ingredient{rows.length === 1 ? "" : "s"}
        </p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ingredients…" className="min-w-[200px] rounded-full border border-ink/20 bg-white/70 px-3 py-1.5 text-[12.5px] outline-none focus:border-ink" aria-label="Search ingredients" />
      </div>
      <div className="max-h-[360px] overflow-y-auto rounded-xl border border-line">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-cream-2">
            <tr className="kicker text-left text-muted">
              <th className="px-3 py-2 font-medium">Ingredient</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 font-medium">₱ / unit</th>
              <th className="px-3 py-2 font-medium">Used in</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={`${r.name}-${r.unit}`} className="border-t border-line">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-muted">{r.unit}</td>
                <td className="px-3 py-2 tabular-nums">{r.unitCost ? peso(r.unitCost) : "—"}</td>
                <td className="px-3 py-2 tabular-nums">
                  {r.usedIn} product{r.usedIn === 1 ? "" : "s"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}


