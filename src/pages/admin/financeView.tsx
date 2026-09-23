import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import type { CostingData } from "@/data/costing";
import { pct, round2 } from "@/data/costing";
import { getServiceChargeRate } from "@/data/menu";
import {
  buildReport,
  bucketFor,
  changePct,
  financeCsv,
  isoDay,
  periodFor,
  type FinanceReport,
  type Kpis,
  type PeriodKind,
} from "@/data/finance";
import { peso } from "@/lib/format";
import { downloadText } from "@/lib/media";
import { Icon } from "@/components/ui";
import { Btn, Panel } from "./fields";

const PERIODS: { id: PeriodKind; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "lastWeek", label: "Last week" },
  { id: "month", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "ytd", label: "YTD" },
  { id: "custom", label: "Custom" },
];

export function FinanceView({ costing }: { costing: CostingData }) {
  const [kind, setKind] = useState<PeriodKind>("month");
  const [from, setFrom] = useState(() => isoDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [sort, setSort] = useState<"sales" | "net" | "qty" | "costPct">("sales");
  const [channel, setChannel] = useState<"all" | "food" | "beverage">("all");

  const period = useMemo(() => periodFor(kind, from, to), [kind, from, to]);
  const report = useMemo(() => buildReport(costing, period, getServiceChargeRate()), [costing, period]);
  const bucket = bucketFor(kind, period.from, period.to);

  const products = useMemo(() => {
    let list = report.products;
    if (channel !== "all") list = list.filter((p) => p.channel === channel);
    const copy = [...list];
    copy.sort((a, b) => (sort === "qty" ? b.qty - a.qty : sort === "net" ? b.net - a.net : sort === "costPct" ? (b.costPct ?? 0) - (a.costPct ?? 0) : b.sales - a.sales));
    return copy;
  }, [report.products, sort, channel]);

  return (
    <>
      <Panel
        title="Financials"
        blurb="Sales, cost of goods and net (gross profit) for the bistro. Figures are built from mock covers until a POS is connected — costs come from the recipes below. Private: never published to the website."
        actions={
          <div className="flex flex-wrap gap-2">
            <DownloadTable filename={`guni-guni-kpis-${stamp(report)}`} {...kpisCsv(report)} label="Download KPIs" />
            <Btn onClick={() => downloadText(`guni-guni-financials-${stamp(report)}.csv`, financeCsv(report), "text/csv")}>
              <Icon.Download size={14} /> Download all tables
            </Btn>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p.id} type="button" onClick={() => setKind(p.id)} className={cn("rounded-full px-3 py-1.5 text-[12.5px]", kind === p.id ? "bg-ink text-cream" : "bg-ink/5 hover:bg-ink/10")}>
              {p.label}
            </button>
          ))}
          {kind === "custom" && (
            <div className="ml-2 flex flex-wrap items-center gap-2 text-[12.5px]">
              <label className="flex items-center gap-1.5">
                From
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-ink/20 bg-white/70 px-2 py-1" />
              </label>
              <label className="flex items-center gap-1.5">
                To
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-ink/20 bg-white/70 px-2 py-1" />
              </label>
            </div>
          )}
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px] text-muted">
          <Icon.CalendarDays size={14} /> {report.period.label}
          <span aria-hidden>·</span>
          vs previous {isoDay(period.prevFrom)} – {isoDay(period.prevTo)}
          <span className="rounded-full bg-yellow/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">Mock sales</span>
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Sales" value={peso(report.kpis.sales)} change={changePct(report.kpis.sales, report.prev.sales)} note="menu price × units" />
          <Kpi label="Cost of goods" value={peso(report.kpis.cost)} change={changePct(report.kpis.cost, report.prev.cost)} invert note="recipe / unit cost" />
          <Kpi label="Net (gross profit)" value={peso(report.kpis.net)} change={changePct(report.kpis.net, report.prev.net)} note="sales − cost" accent />
          <Kpi label="Food / bev cost" value={pct(report.kpis.costPct, 1)} change={deltaPp(report.kpis.costPct, report.prev.costPct)} invert note="cost ÷ sales" />
          <Kpi label="Gross margin" value={pct(report.kpis.marginPct, 1)} change={deltaPp(report.kpis.marginPct, report.prev.marginPct)} note="net ÷ sales" />
          <Kpi label="Covers · avg check" value={String(report.kpis.covers)} change={changePct(report.kpis.covers, report.prev.covers)} note={report.kpis.avgCheck != null ? `avg ${peso(report.kpis.avgCheck)}` : "—"} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <SplitCard title="Food" sales={report.kpis.foodSales} cost={report.kpis.foodCost} />
          <SplitCard title="Beverage" sales={report.kpis.bevSales} cost={report.kpis.bevCost} />
          <div className="rounded-xl border border-line bg-white/50 p-4">
            <p className="kicker text-muted">Service charge (5%)</p>
            <p className="cond mt-1 text-[26px] leading-none">{peso(report.kpis.serviceCharge)}</p>
            <p className="mt-2 text-[11px] text-muted">Collected on top of sales · not in net above</p>
            <p className="mt-2 text-[12.5px]">
              Units sold <strong className="tabular-nums">{report.kpis.units.toLocaleString("en-PH")}</strong>
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Trend"
        blurb={bucket === "day" ? "Each bar is a day." : bucket === "week" ? "Each bar is a week (Mon–Sun)." : "Each bar is a calendar month."}
        actions={
          <DownloadTable
            filename={`guni-guni-trend-${stamp(report)}`}
            headers={["Period", "From", "To", "Units", "Sales PHP", "Cost PHP", "Net PHP", "Cost %"]}
            rows={report.series.map((s) => [s.label, isoDay(s.from), isoDay(s.to), s.units, s.sales.toFixed(2), s.cost.toFixed(2), s.net.toFixed(2), s.sales > 0 ? ((s.cost / s.sales) * 100).toFixed(1) : ""])}
          />
        }
      >
        <TrendChart series={report.series} />
        {/* Stacked cards on phones — no horizontal scrolling */}
        <ul className="mt-4 grid gap-2 md:hidden">
          {report.series.map((s) => {
            const cp = s.sales > 0 ? s.cost / s.sales : null;
            return (
              <li key={s.key} className="rounded-xl border border-line bg-white/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold">{s.label}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", costPill(cp))}>{pct(cp, 1)}</span>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">Units</dt>
                    <dd className="tabular-nums">{s.units.toLocaleString("en-PH")}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">Sales</dt>
                    <dd className="tabular-nums font-medium">{peso(s.sales)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">Cost</dt>
                    <dd className="tabular-nums">{peso(s.cost)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">Net</dt>
                    <dd className="tabular-nums font-medium">{peso(s.net)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        {/* Table on tablet landscape and desktop */}
        <div className="mt-4 hidden md:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="kicker text-left text-muted">
                <th className="pb-2 pr-3 font-medium">Period</th>
                <th className="pb-2 pr-3 font-medium">Units</th>
                <th className="pb-2 pr-3 font-medium">Sales</th>
                <th className="pb-2 pr-3 font-medium">Cost</th>
                <th className="pb-2 pr-3 font-medium">Net</th>
                <th className="pb-2 font-medium">Cost %</th>
              </tr>
            </thead>
            <tbody>
              {report.series.map((s) => (
                <tr key={s.key} className="border-t border-line">
                  <td className="py-1.5 pr-3">{s.label}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{s.units.toLocaleString("en-PH")}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(s.sales)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(s.cost)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(s.net)}</td>
                  <td className="py-1.5 tabular-nums">{s.sales > 0 ? pct(s.cost / s.sales, 1) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="By section"
        actions={
          <DownloadTable
            filename={`guni-guni-sections-${stamp(report)}`}
            headers={["Section", "Channel", "Units", "Sales PHP", "Share %", "Cost PHP", "Net PHP", "Cost %"]}
            rows={report.categories.map((c) => [
              c.title,
              c.channel,
              c.units,
              c.sales.toFixed(2),
              report.kpis.sales > 0 ? ((c.sales / report.kpis.sales) * 100).toFixed(1) : "",
              c.cost.toFixed(2),
              c.net.toFixed(2),
              c.costPct != null ? (c.costPct * 100).toFixed(1) : "",
            ])}
          />
        }
      >
        {/* Stacked cards on phones */}
        <ul className="grid gap-2 md:hidden">
          {report.categories.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-white/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13.5px] font-semibold">{c.title}</p>
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{c.channel}</span>
              </div>
              <p className="cond mt-1 text-[22px] tabular-nums">{peso(c.sales)}</p>
              <div className="mt-1.5 flex items-center gap-2" aria-hidden>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <span className="block h-full rounded-full bg-yellow" style={{ width: `${Math.max(4, (c.sales / Math.max(report.kpis.sales, 1)) * 100)}%` }} />
                </span>
                <span className="tabular-nums text-[11px] text-muted">{pct(c.sales / Math.max(report.kpis.sales, 1), 0)} of sales</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-2 text-[12.5px]">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Units</dt>
                  <dd className="tabular-nums">{c.units.toLocaleString("en-PH")}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Cost %</dt>
                  <dd className={cn("tabular-nums font-semibold", costColor(c.costPct))}>{pct(c.costPct, 1)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Cost</dt>
                  <dd className="tabular-nums">{peso(c.cost)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Net</dt>
                  <dd className="tabular-nums font-medium">{peso(c.net)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        {/* Table on tablet landscape and desktop */}
        <div className="hidden md:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="kicker text-left text-muted">
                <th className="pb-2 pr-3 font-medium">Section</th>
                <th className="pb-2 pr-3 font-medium">Channel</th>
                <th className="pb-2 pr-3 font-medium">Units</th>
                <th className="pb-2 pr-3 font-medium">Sales</th>
                <th className="pb-2 pr-3 font-medium">Share</th>
                <th className="pb-2 pr-3 font-medium">Cost</th>
                <th className="pb-2 pr-3 font-medium">Net</th>
                <th className="pb-2 font-medium">Cost %</th>
              </tr>
            </thead>
            <tbody>
              {report.categories.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <td className="py-1.5 pr-3 font-medium">{c.title}</td>
                  <td className="py-1.5 pr-3 capitalize text-muted">{c.channel}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{c.units.toLocaleString("en-PH")}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(c.sales)}</td>
                  <td className="py-1.5 pr-3">
                    <span className="inline-block h-1.5 rounded-full bg-yellow" style={{ width: `${Math.max(6, (c.sales / Math.max(report.kpis.sales, 1)) * 88)}px` }} />
                    <span className="ml-2 tabular-nums text-[11px] text-muted">{pct(c.sales / Math.max(report.kpis.sales, 1), 0)}</span>
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(c.cost)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(c.net)}</td>
                  <td className={cn("py-1.5 tabular-nums font-medium", costColor(c.costPct))}>{pct(c.costPct, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="By product"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "food", "beverage"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)} className={cn("rounded-full px-3 py-1.5 text-[12px] capitalize", channel === c ? "bg-ink text-cream" : "bg-ink/5")}>
                {c}
              </button>
            ))}
            <DownloadTable
              filename={`guni-guni-products-${channel}-${stamp(report)}`}
              headers={["Product", "Serving", "Section", "Channel", "Units", "Sales PHP", "Cost PHP", "Net PHP", "Cost %"]}
              rows={products.map((p) => [
                p.name,
                p.variant ?? "standard",
                p.section,
                p.channel,
                p.qty,
                p.sales.toFixed(2),
                p.cost.toFixed(2),
                p.net.toFixed(2),
                p.costPct != null ? (p.costPct * 100).toFixed(1) : "",
              ])}
              label="Download table"
            />
          </div>
        }
      >
        {/* Stacked cards on phones */}
        <ul className="grid gap-2 md:hidden">
          {products.slice(0, 40).map((p) => (
            <li key={`${p.itemId}-${p.variant ?? ""}`} className="rounded-xl border border-line bg-white/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">
                    {p.name}
                    {p.variant && <span className="ml-2 rounded bg-yellow/70 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wider">{p.variant}</span>}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] capitalize text-muted">
                    {p.section} · {p.channel}
                  </p>
                </div>
                <span className={cn("flex-none rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", costPill(p.costPct))}>{pct(p.costPct, 1)}</span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-2 text-[12.5px]">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Units</dt>
                  <dd className="tabular-nums">{p.qty.toLocaleString("en-PH")}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Sales</dt>
                  <dd className="tabular-nums font-medium">{peso(p.sales)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Cost</dt>
                  <dd className="tabular-nums">{peso(p.cost)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted">Net</dt>
                  <dd className="tabular-nums font-medium">{peso(p.net)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
        {/* Table on tablet landscape and desktop */}
        <div className="hidden md:block">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="kicker text-left text-muted">
                <SortTh label="Product" />
                <th className="pb-2 pr-3 font-medium">Section</th>
                <SortTh label="Units" active={sort === "qty"} onClick={() => setSort("qty")} />
                <SortTh label="Sales" active={sort === "sales"} onClick={() => setSort("sales")} />
                <th className="pb-2 pr-3 font-medium">Cost</th>
                <SortTh label="Net" active={sort === "net"} onClick={() => setSort("net")} />
                <SortTh label="Cost %" active={sort === "costPct"} onClick={() => setSort("costPct")} />
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 40).map((p) => (
                <tr key={`${p.itemId}-${p.variant ?? ""}`} className="border-t border-line">
                  <td className="py-1.5 pr-3">
                    {p.name}
                    {p.variant && <span className="ml-2 rounded bg-yellow/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{p.variant}</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-muted">{p.section}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{p.qty.toLocaleString("en-PH")}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(p.sales)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(p.cost)}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{peso(p.net)}</td>
                  <td className={cn("py-1.5 tabular-nums font-medium", costColor(p.costPct))}>{pct(p.costPct, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length > 40 && <p className="mt-2 text-[11px] text-muted">Showing top 40 of {products.length} on screen. Download table includes every row.</p>}
      </Panel>
    </>
  );
}

function deltaPp(now: number | null, prev: number | null): number | null {
  if (now == null || prev == null) return null;
  return now - prev; // already a fraction; Kpi will show as pp if we pass through changePct style
}

function costColor(n: number | null) {
  if (n == null) return "text-muted";
  if (n <= 0.35) return "text-leaf";
  if (n <= 0.45) return "text-amber-600";
  return "text-red-600";
}

function Kpi({ label, value, change, note, invert, accent }: { label: string; value: string; change: number | null; note: string; invert?: boolean; accent?: boolean }) {
  const up = change != null && change > 0.004;
  const down = change != null && change < -0.004;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  return (
    <div className={cn("rounded-xl border p-4", accent ? "border-yellow bg-yellow/25" : "border-line bg-white/50")}>
      <p className="kicker text-muted">{label}</p>
      <p className="cond mt-1 text-[24px] leading-none tabular-nums">{value}</p>
      <p className="mt-2 flex items-center gap-1 text-[11.5px]">
        {change == null ? (
          <span className="text-muted">no prior period</span>
        ) : (
          <>
            {up && <Icon.TrendingUp size={13} className={good ? "text-leaf" : "text-red-600"} />}
            {down && <Icon.TrendingDown size={13} className={good ? "text-leaf" : "text-red-600"} />}
            {!up && !down && <span className="text-muted">flat</span>}
            <span className={cn("tabular-nums font-medium", good ? "text-leaf" : bad ? "text-red-600" : "text-muted")}>
              {change > 0 ? "+" : ""}
              {(change * 100).toFixed(1)}%
            </span>
            <span className="text-muted">vs prior</span>
          </>
        )}
      </p>
      <p className="mt-1 text-[11px] text-muted">{note}</p>
    </div>
  );
}

function SplitCard({ title, sales, cost }: { title: string; sales: number; cost: number }) {
  const net = round2(sales - cost);
  const cp = sales > 0 ? cost / sales : null;
  return (
    <div className="rounded-xl border border-line bg-white/50 p-4">
      <p className="kicker text-muted">{title}</p>
      <p className="cond mt-1 text-[26px] leading-none tabular-nums">{peso(sales)}</p>
      <dl className="mt-3 space-y-1 text-[12.5px]">
        <div className="flex justify-between">
          <dt className="text-muted">Cost</dt>
          <dd className="tabular-nums">{peso(cost)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Net</dt>
          <dd className="tabular-nums font-medium">{peso(net)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Cost %</dt>
          <dd className={cn("tabular-nums font-medium", costColor(cp))}>{pct(cp, 1)}</dd>
        </div>
      </dl>
    </div>
  );
}

function costPill(n: number | null) {
  if (n == null) return "bg-ink/5 text-muted";
  if (n <= 0.35) return "bg-leaf/15 text-leaf";
  if (n <= 0.45) return "bg-yellow/50 text-ink";
  return "bg-red-100 text-red-700";
}

/**
 * Sleek, slim trend bars. Each column is a fixed-height cell with absolutely
 * anchored segments (track + cost + net), so bars render at identical proportions
 * on phone, tablet and desktop — no percentage-of-auto collapse. Fully tappable
 * (touch), clickable (mouse) and keyboard accessible.
 */
function TrendChart({ series }: { series: FinanceReport["series"] }) {
  const max = Math.max(...series.map((s) => s.sales), 1);
  const maxIdx = series.reduce((bi, s, i) => (s.sales > (series[bi]?.sales ?? 0) ? i : bi), 0);
  const [active, setActive] = useState(maxIdx);
  const idx = Math.min(active, Math.max(series.length - 1, 0));
  const sel = series[idx];
  const every = Math.max(1, Math.ceil(series.length / 9));

  if (series.length === 0) return <p className="py-8 text-center text-[13px] text-muted">No sales in this period.</p>;

  return (
    <div className="rounded-xl border border-line bg-white/40 p-3 sm:p-4">
      {/* Selected point readout */}
      {sel && (
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line pb-3" aria-live="polite">
          <p className="text-[13px] font-semibold">{sel.label}</p>
          <p className="cond text-[20px] tabular-nums">{peso(sel.sales)}</p>
          <p className="text-[12px] text-muted">
            cost <span className="tabular-nums text-ink">{peso(sel.cost)}</span>
            {" · "}net <span className="tabular-nums font-medium text-ink">{peso(sel.net)}</span>
            {" · "}
            <span className={cn("tabular-nums font-semibold", costColor(sel.sales > 0 ? sel.cost / sel.sales : null))}>
              {sel.sales > 0 ? pct(sel.cost / sel.sales, 1) : "—"}
            </span>
          </p>
          <p className="ml-auto flex items-center gap-3 text-[11px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow" aria-hidden /> Net
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-ink/60" aria-hidden /> Cost
            </span>
          </p>
        </div>
      )}

      {/* Bars */}
      <div className="relative mt-3">
        {/* gridlines */}
        <div className="pointer-events-none absolute inset-x-0 bottom-7 top-0" aria-hidden>
          {[25, 50, 75, 100].map((g) => (
            <span key={g} className="absolute inset-x-0 border-t border-dashed border-ink/10" style={{ bottom: `${g}%` }} />
          ))}
        </div>
        <div className="relative flex h-40 items-stretch gap-0.5 sm:h-48 sm:gap-1" role="group" aria-label="Sales trend">
          {series.map((s, i) => {
            const salesH = Math.max(0, Math.min(100, (s.sales / max) * 100));
            const costH = s.sales > 0 ? Math.max(0, Math.min(salesH, (s.cost / max) * 100)) : 0;
            const netH = Math.max(0, salesH - costH);
            const isActive = i === idx;
            const showLabel = series.length <= 9 || i % every === 0 || isActive;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-pressed={isActive}
                aria-label={`${s.label}: sales ${peso(s.sales)}, cost ${peso(s.cost)}, net ${peso(s.net)}`}
                className="group flex min-h-[44px] min-w-0 flex-1 flex-col items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-yellow"
              >
                <span className="relative block h-40 w-full max-w-[52px] flex-1 sm:h-48">
                  {/* track */}
                  <span className="absolute bottom-0 left-1/2 top-0 w-2 -translate-x-1/2 rounded-full bg-ink/[0.07] sm:w-2.5" aria-hidden />
                  {/* cost segment */}
                  {costH > 0 && (
                    <span
                      className={cn("absolute left-1/2 w-2 -translate-x-1/2 rounded-full bg-ink/60 transition-all duration-500 group-hover:bg-ink group-active:bg-ink sm:w-2.5", isActive && "bg-ink")}
                      style={{ bottom: 0, height: `${costH}%`, minHeight: 3 }}
                      aria-hidden
                    />
                  )}
                  {/* net segment */}
                  {netH > 0 && (
                    <span
                      className={cn("absolute left-1/2 w-2 -translate-x-1/2 rounded-full bg-yellow transition-all duration-500 group-hover:brightness-95 sm:w-2.5", isActive && "shadow-[0_0_0_2px_var(--color-ink)]")}
                      style={{ bottom: `${costH}%`, height: `${netH}%`, minHeight: 3 }}
                      aria-hidden
                    />
                  )}
                  {s.sales === 0 && <span className="absolute bottom-0 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-ink/20" aria-hidden />}
                </span>
                <span className={cn("mt-1.5 h-4 max-w-full truncate text-[9px] sm:text-[10px]", isActive ? "font-semibold text-ink" : "text-muted")}>
                  {showLabel ? s.label.replace("W/c ", "") : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted">Tap a bar to inspect it. Yellow is net, dark is cost.</p>
    </div>
  );
}

function SortTh({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  if (!onClick) return <th className="pb-2 pr-3 font-medium">{label}</th>;
  return (
    <th className="pb-2 pr-3 font-medium">
      <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1", active && "text-ink")}>
        {label}
        {active && <Icon.ArrowDown size={11} />}
      </button>
    </th>
  );
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
}
function stamp(report: FinanceReport): string {
  return `${isoDay(report.period.from)}_${isoDay(report.period.to)}`;
}

function DownloadTable({ filename, headers, rows, label = "Download CSV" }: { filename: string; headers: string[]; rows: unknown[][]; label?: string }) {
  return (
    <Btn
      small
      onClick={() => downloadText(filename.endsWith(".csv") ? filename : `${filename}.csv`, toCsv(headers, rows), "text/csv")}
      title="Download this table as a CSV file"
    >
      <Icon.Download size={13} /> {label}
    </Btn>
  );
}

function kpisCsv(report: FinanceReport): { headers: string[]; rows: unknown[][] } {
  const k = report.kpis;
  const p = report.prev;
  const ch = (a: number, b: number) => (b === 0 ? "" : `${(((a - b) / b) * 100).toFixed(1)}%`);
  return {
    headers: ["Metric", "This period", "Prior period", "Change"],
    rows: [
      ["Period", report.period.label, `${isoDay(report.period.prevFrom)} – ${isoDay(report.period.prevTo)}`, ""],
      ["Sales PHP", k.sales.toFixed(2), p.sales.toFixed(2), ch(k.sales, p.sales)],
      ["Cost of goods PHP", k.cost.toFixed(2), p.cost.toFixed(2), ch(k.cost, p.cost)],
      ["Net (gross profit) PHP", k.net.toFixed(2), p.net.toFixed(2), ch(k.net, p.net)],
      ["Food / bev cost %", k.costPct != null ? (k.costPct * 100).toFixed(1) : "", p.costPct != null ? (p.costPct * 100).toFixed(1) : "", ""],
      ["Gross margin %", k.marginPct != null ? (k.marginPct * 100).toFixed(1) : "", p.marginPct != null ? (p.marginPct * 100).toFixed(1) : "", ""],
      ["Covers", k.covers, p.covers, ch(k.covers, p.covers)],
      ["Average check PHP", k.avgCheck?.toFixed(2) ?? "", p.avgCheck?.toFixed(2) ?? "", ""],
      ["Units sold", k.units, p.units, ch(k.units, p.units)],
      ["Food sales PHP", k.foodSales.toFixed(2), p.foodSales.toFixed(2), ch(k.foodSales, p.foodSales)],
      ["Food cost PHP", k.foodCost.toFixed(2), p.foodCost.toFixed(2), ""],
      ["Beverage sales PHP", k.bevSales.toFixed(2), p.bevSales.toFixed(2), ch(k.bevSales, p.bevSales)],
      ["Beverage cost PHP", k.bevCost.toFixed(2), p.bevCost.toFixed(2), ""],
      ["Service charge 5% PHP", k.serviceCharge.toFixed(2), p.serviceCharge.toFixed(2), ""],
    ],
  };
}

/** Keep TypeScript happy if Kpis is imported for future cards. */
export type { Kpis };
