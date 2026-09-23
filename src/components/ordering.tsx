import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { BUILT_IN_SECTION_IDS, getItem, getMenu, hasVariants, resolvePrice, sectionLabel, type MenuItem, type MenuPage, type MenuSection, type Variant } from "@/data/menu";
import { peso } from "@/lib/format";
import { ApiError, DEMO_PIN } from "@/lib/backend";
import { Icon, Leaf, Modal, Stepper } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* Menu rows                                                            */
/* ------------------------------------------------------------------ */

interface RowProps {
  item: MenuItem;
  section: MenuSection;
  className?: string;
}

function useRow(item: MenuItem) {
  const { openItem, unavailable } = useApp();
  const isUnavailable = unavailable.has(item.id);
  const open = () => {
    if (isUnavailable) return;
    openItem(item.id);
  };
  return { open, isUnavailable };
}

function rowA11y(item: MenuItem, isUnavailable: boolean, price?: string) {
  return {
    "aria-label": `${item.name}${item.vegetarian ? ", vegetarian" : ""}${price ? `, ${price}` : ""}${isUnavailable ? ", currently unavailable" : ". Add to order"}`,
    "aria-disabled": isUnavailable || undefined,
  };
}

/** Pasta-page row: condensed uppercase name, price at right, description underneath, hairline divider. */
export function PastaRow({ item, section, className }: RowProps) {
  const { open, isUnavailable } = useRow(item);
  const price = resolvePrice(item) ?? 0;
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "menu-row tap-row block w-full border-b border-line/90 py-[9px] text-left last:border-b-0",
        isUnavailable && "cursor-not-allowed opacity-45",
        className,
      )}
      {...rowA11y(item, isUnavailable, peso(price))}
      data-section={section.id}
    >
      <span className="flex items-center gap-2">
        <span className="cond text-[15px] font-medium uppercase leading-tight tracking-[0.01em]">{item.name}</span>
        {item.vegetarian && <Leaf size={17} />}
        {isUnavailable && <span className="kicker rounded-sm bg-ink/10 px-1.5 py-0.5 text-[8px]">Unavailable</span>}
        <span className="cond ml-auto text-[15px] font-medium tabular-nums">{peso(price)}</span>
        {!isUnavailable && (
          <span className="plus-btn" aria-hidden>
            <Icon.Plus size={13} />
          </span>
        )}
      </span>
      {item.description && <span className="mt-[3px] block text-[11.5px] leading-snug text-muted">{item.description}</span>}
    </button>
  );
}

/** Pizza / burgers / sides / cocktails rows: plain sans name with price at the column edge. */
export function SimpleRow({ item, section, className, size = "md" }: RowProps & { size?: "sm" | "md" | "lg" }) {
  const { open, isUnavailable } = useRow(item);
  const price = resolvePrice(item) ?? 0;
  const text = size === "lg" ? "text-[16.5px]" : size === "sm" ? "text-[14px]" : "text-[15px]";
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "menu-row flex min-h-[34px] w-full items-center gap-2 py-[3px] text-left",
        isUnavailable && "cursor-not-allowed opacity-45",
        className,
      )}
      {...rowA11y(item, isUnavailable, peso(price))}
      data-section={section.id}
    >
      <span className={cn("leading-tight", text)}>{item.name}</span>
      {item.vegetarian && <Leaf size={16} />}
      {isUnavailable && <span className="kicker rounded-sm bg-ink/10 px-1.5 py-0.5 text-[8px]">Unavailable</span>}
      <span className={cn("ml-auto tabular-nums leading-tight", text, size === "lg" && "font-medium")}>{peso(price)}</span>
      {!isUnavailable && (
        <span className="plus-btn" aria-hidden>
          <Icon.Plus size={13} />
        </span>
      )}
    </button>
  );
}

/** Wine / spirits row with Glass and Bottle prices. Tapping requires choosing a size in the sheet. */
export function DualRow({ item, section, className }: RowProps) {
  const { open, isUnavailable } = useRow(item);
  const glass = item.prices?.glass ?? 0;
  const bottle = item.prices?.bottle ?? 0;
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "menu-row grid min-h-[28px] w-full grid-cols-[1fr_56px_60px_26px] items-center gap-x-1 py-[1px] text-left text-[14.5px] sm:grid-cols-[1fr_62px_68px_26px]",
        isUnavailable && "cursor-not-allowed opacity-45",
        className,
      )}
      {...rowA11y(item, isUnavailable, `glass ${peso(glass)}, bottle ${peso(bottle)}`)}
      data-section={section.id}
    >
      <span className="flex items-center gap-2 leading-tight">
        {item.name}
        {isUnavailable && <span className="kicker rounded-sm bg-ink/10 px-1.5 py-0.5 text-[8px]">Unavailable</span>}
      </span>
      <span className="tabular-nums leading-tight">{peso(glass)}</span>
      <span className="tabular-nums leading-tight">{peso(bottle)}</span>
      {!isUnavailable ? (
        <span className="plus-btn justify-self-end" aria-hidden>
          <Icon.Plus size={13} />
        </span>
      ) : (
        <span />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Item sheet                                                           */
/* ------------------------------------------------------------------ */

export function ItemSheet() {
  const { sheet, lines } = useApp();
  const entry = sheet ? getItem(sheet.itemId) : undefined;
  const editing = sheet?.editLineId ? lines.find((l) => l.lineId === sheet.editLineId) : undefined;
  if (!sheet || !entry) return null;
  return (
    <ItemSheetBody
      key={`${sheet.itemId}:${sheet.editLineId ?? "new"}`}
      entry={entry}
      initialQty={editing?.qty ?? 1}
      initialNotes={editing?.notes ?? ""}
      initialVariant={editing?.variant ?? sheet.variant ?? null}
      editLineId={editing?.lineId}
    />
  );
}

function ItemSheetBody({
  entry,
  initialQty,
  initialNotes,
  initialVariant,
  editLineId,
}: {
  entry: { item: MenuItem; section: MenuSection };
  initialQty: number;
  initialNotes: string;
  initialVariant: Variant | null;
  editLineId?: string;
}) {
  const { closeSheet, addLine, updateLine, unavailable, toast } = useApp();
  const [qty, setQty] = useState(initialQty);
  const [notes, setNotes] = useState(initialNotes);
  const [variant, setVariant] = useState<Variant | null>(initialVariant);
  const editing = editLineId ? { lineId: editLineId } : undefined;
  const { item, section } = entry;
  const needsVariant = hasVariants(section);
  const unitPrice = resolvePrice(item, variant);
  const isUnavailable = unavailable.has(item.id);
  const canAdd = !isUnavailable && unitPrice != null && qty >= 1;
  const total = unitPrice != null ? unitPrice * qty : null;

  const subInfo = section.subtitle ? section.subtitle : null;

  const confirm = () => {
    if (!canAdd) return;
    if (editing) {
      updateLine(editing.lineId, { qty, notes: notes.trim(), variant: needsVariant ? variant : null });
      toast(`Updated ${item.name}`);
    } else {
      addLine({ itemId: item.id, variant: needsVariant ? variant : null, qty, notes: notes.trim() });
      toast(`Added ${item.name}${needsVariant && variant ? ` (${variant})` : ""} × ${qty}`);
    }
    closeSheet();
  };

  return (
    <Modal open onClose={closeSheet} variant="sheet" labelledBy="item-sheet-title">
      <div className="mx-auto mt-2 h-1.5 w-12 flex-none rounded-full bg-ink/15 md:hidden" aria-hidden />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-3 md:px-7 md:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="kicker text-muted">{sectionLabel(section)}</p>
            <h2 id="item-sheet-title" className="display mt-2 text-[34px] leading-[0.95] md:text-[40px]">
              {item.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {item.vegetarian && (
                <span className="inline-flex items-center gap-1 rounded-full border border-leaf/40 bg-leaf/10 px-2 py-0.5 text-[11px] font-semibold text-leaf">
                  <Leaf size={13} /> Vegetarian
                </span>
              )}
              {subInfo && <span className="kicker text-[9px] text-muted">{subInfo}</span>}
              {isUnavailable && <span className="kicker rounded-sm bg-ink/10 px-2 py-1 text-[9px]">Currently unavailable</span>}
            </div>
          </div>
          <button type="button" onClick={closeSheet} className="grid h-10 w-10 flex-none place-items-center rounded-full border border-ink/20" aria-label="Close">
            <Icon.X size={18} />
          </button>
        </div>

        {item.description && <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{item.description}</p>}
        {section.note && <p className="mt-3 text-[13px] text-muted">{section.note}</p>}

        {needsVariant && (
          <fieldset className="mt-5">
            <legend className="kicker mb-2 text-muted">Choose a size · required</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Glass or bottle">
              {(section.variants as Variant[]).map((v) => {
                const p = item.prices?.[v] ?? 0;
                const active = variant === v;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setVariant(v)}
                    className={cn(
                      "flex min-h-[56px] items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                      active ? "border-ink bg-ink text-cream" : "border-ink/25 bg-white/40 hover:border-ink/60",
                    )}
                  >
                    <span className="cond text-[17px] font-medium uppercase tracking-wide">{v}</span>
                    <span className="tabular-nums text-[15px]">{peso(p)}</span>
                  </button>
                );
              })}
            </div>
            {!variant && <p className="mt-2 text-[12px] text-muted">Select Glass or Bottle to see the exact price.</p>}
          </fieldset>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="kicker text-muted">Price</p>
            <p className="cond mt-1 text-[24px] font-medium tabular-nums">{unitPrice != null ? peso(unitPrice) : "—"}</p>
          </div>
          <Stepper value={qty} onChange={setQty} />
        </div>

        <label className="mt-5 block">
          <span className="kicker text-muted">Preparation notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Anything the kitchen should know?"
            className="mt-2 w-full resize-none rounded-xl border border-ink/20 bg-white/50 px-3 py-2.5 text-[15px] outline-none placeholder:text-muted/70 focus:border-ink"
          />
          <span className="mt-1 block text-right text-[11px] text-muted">{notes.length}/200</span>
        </label>
      </div>

      <div className="flex-none border-t border-line bg-cream px-5 pb-[calc(var(--sab)+14px)] pt-3 md:px-7 md:pb-6">
        <button
          type="button"
          onClick={confirm}
          disabled={!canAdd}
          data-autofocus
          className="flex min-h-[54px] w-full items-center justify-between rounded-full bg-ink px-6 text-cream transition enabled:hover:bg-black enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="cond text-[16px] font-medium uppercase tracking-[0.12em]">
            {isUnavailable ? "Unavailable" : editing ? "Update order" : "Add to order"}
          </span>
          <span className="cond text-[18px] tabular-nums">{total != null ? peso(total) : needsVariant ? "Choose size" : ""}</span>
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* View order bar                                                       */
/* ------------------------------------------------------------------ */

export function CartBar() {
  const { itemCount, totals, setCartOpen, cartOpen, sheet } = useApp();
  if (itemCount === 0 || cartOpen || sheet) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(var(--sab)+12px)] md:inset-x-auto md:right-6 md:bottom-6 md:px-0 md:pb-0">
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="anim-pop-in pointer-events-auto flex min-h-[54px] w-full max-w-[560px] items-center justify-between gap-4 rounded-full bg-ink px-5 text-cream shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition hover:bg-black active:scale-[0.99] md:w-auto md:min-w-[280px]"
        aria-label={`View order, ${itemCount} item${itemCount === 1 ? "" : "s"}, total ${peso(totals.total)}`}
      >
        <span className="flex items-center gap-3">
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-yellow px-2 text-[13px] font-bold text-ink tabular-nums">{itemCount}</span>
          <span className="cond text-[15px] font-medium uppercase tracking-[0.14em]">View order</span>
        </span>
        <span className="cond text-[17px] tabular-nums">{peso(totals.total)}</span>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cart drawer + checkout                                               */
/* ------------------------------------------------------------------ */

const TABLE_KEY = "gg.table";

export function CartDrawer() {
  const { cartOpen, setCartOpen, pricedLines, totals, itemCount, updateLine, removeLine, openItem, clearCart, backend, mode, submissionKey, refreshAvailability } =
    useApp();
  const navigate = useNavigate();
  const [table, setTable] = useState(() => localStorage.getItem(TABLE_KEY) ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    localStorage.setItem(TABLE_KEY, table);
  }, [table]);

  useEffect(() => {
    if (cartOpen) {
      setError(null);
      void refreshAvailability();
    }
  }, [cartOpen, refreshAvailability]);

  const hasUnavailable = pricedLines.some((l) => l.unavailable);
  const tableOk = table.trim().length > 0 && table.trim().length <= 6;
  const canSubmit = !!backend && !submitting && itemCount > 0 && !hasUnavailable && tableOk;

  const submit = async () => {
    setTouched(true);
    if (!backend || submitting) return;
    if (!tableOk) {
      setError("Please enter your table number before sending your order.");
      return;
    }
    if (hasUnavailable) {
      setError("Some items are no longer available. Please remove them to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await backend.submitOrder({
        idempotencyKey: submissionKey,
        tableNumber: table.trim(),
        lines: pricedLines.map((l) => ({ itemId: l.itemId, variant: l.variant, qty: l.qty, notes: l.notes })),
      });
      // Only after the backend confirms the order was stored:
      clearCart();
      setCartOpen(false);
      navigate(`/order/${order.id}`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Something went wrong while sending your order. Please try again.";
      setError(msg);
      if (e instanceof ApiError && e.code === "UNAVAILABLE") void refreshAvailability();
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => setCartOpen(false);

  return (
    <Modal open={cartOpen} onClose={close} variant="drawer" labelledBy="cart-title">
      <div className="mx-auto mt-2 h-1.5 w-12 flex-none rounded-full bg-ink/15 md:hidden" aria-hidden />
      <header className="flex flex-none items-start justify-between px-5 pb-3 pt-3 md:px-6 md:pt-6">
        <div>
          <p className="kicker text-muted">Dine-in · Pay at the counter</p>
          <h2 id="cart-title" className="display mt-1 text-[34px]">
            Your order.
          </h2>
        </div>
        <button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-full border border-ink/20" aria-label="Close order">
          <Icon.X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 md:px-6">
        {pricedLines.length === 0 ? (
          <div className="py-10 text-center">
            <p className="cond text-lg uppercase tracking-wide">Nothing here yet.</p>
            <p className="mt-1 text-sm text-muted">Tap any dish or drink to add it to your order.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {pricedLines.map((l) => (
              <li key={l.lineId} className="py-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="cond text-[16px] font-medium uppercase leading-tight">
                      {l.name}
                      {l.variant && <span className="ml-2 rounded-sm bg-yellow/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{l.variant}</span>}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {peso(l.unitPrice)} each{l.unavailable && <span className="ml-2 font-semibold text-red-700">Unavailable now</span>}
                    </p>
                    {l.notes ? (
                      <p className="mt-1 text-[12.5px] italic text-ink/75">“{l.notes}”</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-[12px]">
                      <button type="button" className="underline underline-offset-2" onClick={() => openItem(l.itemId, { editLineId: l.lineId, variant: l.variant })}>
                        {l.notes ? "Edit note" : "Add note"}
                      </button>
                      <button type="button" className="inline-flex items-center gap-1 text-red-700 underline underline-offset-2" onClick={() => removeLine(l.lineId)}>
                        <Icon.Trash size={12} /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="cond text-[16px] tabular-nums">{peso(l.lineTotal)}</span>
                    <Stepper size="sm" value={l.qty} onChange={(q) => updateLine(l.lineId, { qty: q })} label={`Quantity for ${l.name}`} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pricedLines.length > 0 && (
          <>
            <dl className="mt-4 space-y-1.5 border-t border-ink pt-3 text-[14px]">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{peso(totals.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Service charge (5%)</dt>
                <dd className="tabular-nums">{peso(totals.serviceCharge)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="cond text-[17px] font-medium uppercase">Total</dt>
                <dd className="cond text-[20px] font-medium tabular-nums">{peso(totals.total)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted">A 5% service charge will be added to your total bill. Prices in Philippine pesos.</p>

            <label className="mt-5 block">
              <span className="kicker text-muted">Table number · required</span>
              <input
                value={table}
                onChange={(e) => setTable(e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 6))}
                onBlur={() => setTouched(true)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 12"
                aria-invalid={touched && !tableOk}
                className={cn(
                  "cond mt-2 w-full rounded-xl border bg-white/60 px-4 py-3 text-[22px] tracking-wider outline-none focus:border-ink",
                  touched && !tableOk ? "border-red-600" : "border-ink/25",
                )}
              />
              {touched && !tableOk && <span className="mt-1 block text-[12px] text-red-700">Your table number is on the table card.</span>}
            </label>

            <BackendNotice mode={mode} className="mt-4" />
          </>
        )}
      </div>

      <div className="flex-none border-t border-line bg-cream px-5 pb-[calc(var(--sab)+14px)] pt-3 md:px-6 md:pb-6">
        {error && (
          <div role="alert" className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
            {error} <span className="block text-[12px] text-red-700/80">Your order has been kept — nothing was lost.</span>
          </div>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit && !error}
          aria-busy={submitting}
          className="flex min-h-[54px] w-full items-center justify-between rounded-full bg-ink px-6 text-cream transition enabled:hover:bg-black enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="cond text-[16px] font-medium uppercase tracking-[0.12em]">
            {submitting ? "Sending…" : error ? "Try again" : mode === "checking" ? "Connecting…" : "Send order"}
          </span>
          <span className="cond text-[18px] tabular-nums">{peso(totals.total)}</span>
        </button>
      </div>
    </Modal>
  );
}

export function BackendNotice({ mode, className }: { mode: "checking" | "live" | "demo"; className?: string }) {
  if (mode === "live") {
    return (
      <p className={cn("flex items-center gap-2 text-[12px] text-muted", className)}>
        <span className="h-2 w-2 rounded-full bg-leaf" aria-hidden /> Connected to the restaurant server.
      </p>
    );
  }
  if (mode === "checking") {
    return (
      <p className={cn("flex items-center gap-2 text-[12px] text-muted", className)}>
        <span className="h-2 w-2 animate-pulse rounded-full bg-yellow" aria-hidden /> Connecting to the restaurant server…
      </p>
    );
  }
  return (
    <div className={cn("rounded-xl border border-yellow bg-yellow/20 px-3 py-2 text-[12px] leading-snug", className)}>
      <strong className="font-semibold">Demo mode — restaurant server not connected.</strong> Orders sent now are stored only in this browser's demo
      storage (visible in the staff dashboard of this same browser, PIN {DEMO_PIN}). Run <code className="rounded bg-ink/10 px-1">node server/index.mjs</code> to
      enable real persistent storage.
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                               */
/* ------------------------------------------------------------------ */

export function Toasts() {
  const { toasts, itemCount } = useApp();
  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2",
        itemCount > 0 ? "bottom-[calc(var(--sab)+84px)] md:bottom-24" : "bottom-[calc(var(--sab)+20px)] md:bottom-8",
      )}
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div key={t.id} className="anim-pop-in rounded-full bg-ink/92 px-4 py-2 text-[13px] text-cream shadow-lg backdrop-blur">
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* Small helper for headings in the sheet/cards */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("kicker", className)}>{children}</p>;
}

/** Menu sections created in the admin that have no dedicated spot in the reference layouts. */
export function ExtraSections({ page }: { page: MenuPage }) {
  const { vegOnly } = useApp();
  const sections = getMenu().sections.filter((s) => s.page === page && !BUILT_IN_SECTION_IDS.includes(s.id));
  if (sections.length === 0) return null;
  return (
    <section className="px-4 pt-6 sm:px-[calc(22*var(--u))]" aria-label="More from the menu">
      <div className="grid gap-8 sm:grid-cols-2">
        {sections.map((s) => {
          const items = s.items.filter((i) => !vegOnly || i.vegetarian);
          const dual = hasVariants(s);
          return (
            <div key={s.id} id={s.id}>
              {s.group && <p className="kicker text-muted">{s.group}</p>}
              <div className="flex items-center gap-3">
                <h2 className="display text-[32px] leading-[0.9] sm:text-[calc(36*var(--u))]">{s.title}</h2>
                <span className="rule-y flex-1" aria-hidden />
              </div>
              {s.subtitle && <p className="kicker mt-1 text-[9px] font-bold tracking-[0.3em]">{s.subtitle}</p>}
              {dual && (
                <div className="mt-2 grid grid-cols-[1fr_56px_60px_26px] gap-x-1 text-[12.5px] text-ink/85 sm:grid-cols-[1fr_62px_68px_26px]" aria-hidden>
                  <span />
                  <span>Glass</span>
                  <span>Bottle</span>
                  <span />
                </div>
              )}
              <ul className="mt-2">
                {items.map((item) => (
                  <li key={item.id}>{dual ? <DualRow item={item} section={s} /> : <SimpleRow item={item} section={s} size="lg" className="min-h-[30px] py-[2px]" />}</li>
                ))}
                {items.length === 0 && <li className="py-2 text-[12px] text-muted">{vegOnly ? "Nothing marked vegetarian here." : "No items yet."}</li>}
              </ul>
              {s.note && <p className="mt-2 text-[11.5px] text-muted">{s.note}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* Sort helper for staff screens */
export function useSorted<T>(list: T[], key: (t: T) => number) {
  return useMemo(() => [...list].sort((a, b) => key(b) - key(a)), [list, key]);
}
