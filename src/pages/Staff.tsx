import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { getMenu, hasVariants } from "@/data/menu";
import { ALLOWED_TRANSITIONS, ApiError, DEMO_PIN, STATUS_LABEL, type Order, type OrderStatus } from "@/lib/backend";
import { formatTime, peso, timeAgo } from "@/lib/format";
import { Icon, Leaf, Logo } from "@/components/ui";
import { AgentOps } from "@/components/AgentOps";

const TOKEN_KEY = "gg.staff.token";
type Tab = "new" | "active" | "done" | "menu";

const ACTION_LABEL: Record<OrderStatus, string> = {
  submitted: "Submitted",
  accepted: "Accept order",
  preparing: "Start preparing",
  ready: "Mark ready",
  completed: "Complete",
  cancelled: "Cancel",
};

export default function Staff() {
  const { backend, mode, unavailable, refreshAvailability } = useApp();
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [tick, setTick] = useState(0);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrders([]);
  }, []);

  const load = useCallback(async () => {
    if (!backend || !token) return;
    try {
      const list = await backend.staffOrders(token);
      setOrders(list);
      setError(null);
      setTick((t) => t + 1);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(e instanceof Error ? e.message : "Could not load orders.");
    }
  }, [backend, token, logout]);

  useEffect(() => {
    if (!token || !backend) return;
    void load();
    const unsub = backend.subscribe(() => void load());
    const t = window.setInterval(() => void load(), 4000);
    return () => {
      unsub();
      window.clearInterval(t);
    };
  }, [token, backend, load]);

  const grouped = useMemo(() => {
    const byTime = (a: Order, b: Order) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return {
      new: orders.filter((o) => o.status === "submitted").sort((a, b) => -byTime(a, b)),
      active: orders.filter((o) => ["accepted", "preparing", "ready"].includes(o.status)).sort((a, b) => -byTime(a, b)),
      done: orders.filter((o) => ["completed", "cancelled"].includes(o.status)).sort(byTime),
    };
  }, [orders]);

  useEffect(() => {
    document.title = grouped.new.length > 0 ? `(${grouped.new.length}) New orders — GUNI GUNI Staff` : "GUNI GUNI Staff";
    return () => {
      document.title = "GUNI GUNI Bistro — Good Food, Good People";
    };
  }, [grouped.new.length]);

  const login = async (e: FormEvent) => {
    e.preventDefault();
    if (!backend) return;
    setBusy(true);
    setLoginError(null);
    try {
      const result = await backend.staffLogin(backend.authKind === "password" ? { email: email.trim(), password } : { pin: pin.trim() });
      sessionStorage.setItem(TOKEN_KEY, result.token);
      sessionStorage.setItem("gg.staff.role", result.role);
      setToken(result.token);
      setPin("");
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const update = async (order: Order, status: OrderStatus) => {
    if (!backend || !token) return;
    if (status === "cancelled" && !window.confirm(`Cancel order ${order.number} for table ${order.tableNumber}?`)) return;
    try {
      const updated = await backend.staffUpdateStatus(token, order.id, status);
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(e instanceof Error ? e.message : "Update failed.");
      void load();
    }
  };

  const toggleAvailability = async (itemId: string, available: boolean) => {
    if (!backend || !token) return;
    try {
      await backend.staffSetAvailability(token, itemId, available);
      await refreshAvailability();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) logout();
      else setError(e instanceof Error ? e.message : "Could not update availability.");
    }
  };

  /* ------------------------------- Login ------------------------------- */
  if (!token) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-5 py-10">
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <div>
            <p className="cond text-[15px] font-medium tracking-[0.2em]">GUNI GUNI BISTRO</p>
            <p className="kicker text-muted">Staff sign-in</p>
          </div>
        </div>
        <h1 className="display mt-8 text-[46px]">Orders.</h1>
        <form onSubmit={login} className="mt-5">
          {backend?.authKind === "password" ? (
            <>
              <label className="block">
                <span className="kicker text-muted">Staff email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" className="mt-2 w-full rounded-xl border border-ink/25 bg-white/60 px-4 py-3 text-[16px] outline-none focus:border-ink" autoFocus />
              </label>
              <label className="mt-3 block">
                <span className="kicker text-muted">Password</span>
                <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-ink/25 bg-white/60 px-4 py-3 text-[16px] outline-none focus:border-ink" aria-invalid={!!loginError} />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="kicker text-muted">Staff PIN</span>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="cond mt-2 w-full rounded-xl border border-ink/25 bg-white/60 px-4 py-3 text-[24px] tracking-[0.4em] outline-none focus:border-ink"
                aria-invalid={!!loginError}
                autoFocus
              />
            </label>
          )}
          {loginError && (
            <p role="alert" className="mt-2 text-[13px] text-red-700">
              {loginError}
            </p>
          )}
          <button type="submit" disabled={busy || !backend || (backend.authKind === "password" ? !email || !password : !pin)} className="cond mt-4 w-full rounded-full bg-ink py-3.5 text-[16px] font-medium uppercase tracking-[0.12em] text-cream disabled:opacity-40">
            {busy ? "Signing in…" : mode === "checking" ? "Connecting…" : "Sign in"}
          </button>
        </form>
        <ModeBadge mode={mode} className="mt-6" />
        <Link to="/" className="kicker mt-8 inline-flex items-center gap-2 text-muted">
          <Icon.ArrowLeft size={12} /> Back to the website
        </Link>
      </div>
    );
  }

  /* ----------------------------- Dashboard ----------------------------- */
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "new", label: "New", count: grouped.new.length },
    { id: "active", label: "In progress", count: grouped.active.length },
    { id: "done", label: "Done", count: grouped.done.length },
    { id: "menu", label: "Menu availability", count: unavailable.size || undefined },
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1100px] px-4 pb-[calc(var(--sab)+32px)]">
      <header className="flex flex-wrap items-center gap-3 border-b border-ink/70 py-3">
        <Logo size={44} />
        <div>
          <p className="cond text-[15px] font-medium tracking-[0.2em]">GUNI GUNI BISTRO</p>
          <p className="kicker text-muted">Staff orders</p>
        </div>
        <ModeBadge mode={mode} className="ml-2" />
        <span className="ml-auto text-[11px] text-muted" aria-live="polite">
          Auto-refreshing · {tick > 0 ? "live" : "…"}
        </span>
        <button type="button" onClick={logout} className="kicker border border-ink px-3 py-2 font-semibold">
          Sign out
        </button>
      </header>

      <nav className="no-scrollbar -mx-4 mt-3 flex gap-1 overflow-x-auto px-4" aria-label="Order views">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "cond flex flex-none items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium uppercase tracking-[0.08em] transition",
              tab === t.id ? "bg-ink text-cream" : "bg-ink/5 hover:bg-ink/10",
            )}
          >
            {t.label}
            {t.count ? (
              <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums", t.id === "new" ? "bg-yellow text-ink" : "bg-ink/15 text-inherit")}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
          {error}
        </p>
      )}

      {tab !== "menu" ? (
        <section className="mt-4" aria-live="polite">
          {grouped[tab].length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line py-14 text-center text-sm text-muted">
              {tab === "new" ? "No new orders. New table orders will appear here automatically." : tab === "active" ? "Nothing in progress." : "No completed or cancelled orders yet."}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {grouped[tab].map((o) => (
                <OrderCard key={o.id} order={o} onUpdate={update} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="mt-4">
          <p className="text-[13px] text-muted">Unavailable items stay visible on the menu but can't be added to an order. Prices are always taken from the menu file.</p>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
            {getMenu().sections.map((section) => (
              <div key={section.id}>
                <h2 className="cond border-b border-ink pb-1 text-[16px] font-medium uppercase tracking-[0.08em]">
                  {section.page === "pasta" ? `${section.group} · ` : ""}
                  {section.title}
                </h2>
                <ul className="divide-y divide-line">
                  {section.items.map((item) => {
                    const off = unavailable.has(item.id);
                    return (
                      <li key={item.id} className="flex items-center gap-3 py-2">
                        <span className={cn("flex-1 text-[14px]", off && "text-muted line-through")}>
                          {item.name}
                          {item.vegetarian && <Leaf size={13} className="ml-1" />}
                          <span className="ml-2 text-[12px] text-muted tabular-nums">
                            {hasVariants(section) && item.prices ? `${peso(item.prices.glass)} / ${peso(item.prices.bottle)}` : peso(item.price ?? 0)}
                          </span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!off}
                          aria-label={`${item.name} available`}
                          onClick={() => toggleAvailability(item.id, off)}
                          className={cn(
                            "relative h-7 w-12 flex-none rounded-full transition",
                            off ? "bg-ink/20" : "bg-leaf",
                          )}
                        >
                          <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", off ? "left-1" : "left-6")} />
                        </button>
                        <span className={cn("w-[84px] text-[11px] uppercase tracking-wider", off ? "text-red-700" : "text-muted")}>{off ? "Unavailable" : "Available"}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      <AgentOps token={token} audience="staff" />
    </div>
  );
}

function ModeBadge({ mode, className }: { mode: "checking" | "live" | "demo"; className?: string }) {
  if (mode === "live")
    return (
      <span className={cn("inline-flex items-center gap-2 rounded-full bg-leaf/15 px-3 py-1 text-[11px] font-semibold text-leaf", className)}>
        <span className="h-2 w-2 rounded-full bg-leaf" /> Live · server storage
      </span>
    );
  if (mode === "checking") return <span className={cn("text-[11px] text-muted", className)}>Connecting to server…</span>;
  return (
    <span className={cn("inline-flex max-w-full flex-col rounded-xl border border-yellow bg-yellow/20 px-3 py-2 text-[11px] leading-snug", className)}>
      <strong className="font-semibold">Demo mode — server not connected.</strong>
      <span>
        Showing orders from this browser's demo storage only. Demo PIN: {DEMO_PIN}. Start <code className="rounded bg-ink/10 px-1">node server/index.mjs</code> and set STAFF_PIN for real operations.
      </span>
    </span>
  );
}

function OrderCard({ order, onUpdate }: { order: Order; onUpdate: (o: Order, s: OrderStatus) => void }) {
  const next = ALLOWED_TRANSITIONS[order.status].filter((s) => s !== "cancelled")[0];
  const canCancel = ALLOWED_TRANSITIONS[order.status].includes("cancelled");
  const isNew = order.status === "submitted";
  return (
    <li className={cn("anim-pop-in flex flex-col rounded-2xl border bg-white/50 p-4", isNew ? "border-yellow shadow-[0_0_0_3px_rgba(232,183,62,0.25)]" : "border-line")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="display text-[30px] leading-none">{order.number}</p>
          <p className="cond mt-1 text-[18px] font-medium uppercase tracking-[0.08em]">Table {order.tableNumber}</p>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
              isNew ? "bg-yellow" : order.status === "cancelled" ? "bg-red-100 text-red-800" : order.status === "completed" ? "bg-ink/10" : "bg-ink text-cream",
            )}
          >
            {STATUS_LABEL[order.status]}
          </span>
          <p className="mt-1 text-[11px] text-muted">
            {formatTime(order.createdAt)} · {timeAgo(order.createdAt)}
          </p>
        </div>
      </div>

      <ul className="mt-3 flex-1 divide-y divide-line border-y border-line">
        {order.lines.map((l, i) => (
          <li key={i} className="py-2">
            <div className="flex items-start justify-between gap-2 text-[14.5px]">
              <span>
                <span className="cond mr-2 inline-block min-w-[2.2ch] rounded bg-ink px-1 text-center text-[13px] font-medium text-cream">{l.qty}×</span>
                {l.name}
                {l.variant && <span className="ml-2 rounded-sm bg-yellow/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{l.variant}</span>}
              </span>
              <span className="tabular-nums text-muted">{peso(l.lineTotal)}</span>
            </div>
            {l.notes && <p className="mt-1 rounded-md bg-yellow/30 px-2 py-1 text-[13px] font-medium">Note: {l.notes}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between text-[13px]">
        <span className="text-muted">Subtotal {peso(order.subtotal)} + 5% {peso(order.serviceCharge)}</span>
        <span className="cond text-[18px] font-medium tabular-nums">{peso(order.total)}</span>
      </div>

      {(next || canCancel) && (
        <div className="mt-3 flex gap-2">
          {next && (
            <button
              type="button"
              onClick={() => onUpdate(order, next)}
              className="cond flex-1 rounded-full bg-ink py-3 text-[14px] font-medium uppercase tracking-[0.1em] text-cream transition hover:bg-black"
            >
              {ACTION_LABEL[next]}
            </button>
          )}
          {canCancel && (
            <button type="button" onClick={() => onUpdate(order, "cancelled")} className="cond rounded-full border border-red-300 px-4 py-3 text-[14px] font-medium uppercase tracking-[0.1em] text-red-700 hover:bg-red-50">
              Cancel
            </button>
          )}
        </div>
      )}
    </li>
  );
}
