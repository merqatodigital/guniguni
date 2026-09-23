import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { STATUS_FLOW, STATUS_LABEL, type Order } from "@/lib/backend";
import { formatTime, peso } from "@/lib/format";
import { Icon, Logo } from "@/components/ui";
import { BackendNotice } from "@/components/ordering";

const STATUS_HINT: Record<Order["status"], string> = {
  submitted: "Your order has been saved and sent to the restaurant. Waiting for the team to accept it.",
  accepted: "The restaurant has accepted your order and will start on it shortly.",
  preparing: "The kitchen is preparing your order now.",
  ready: "Your order is ready — a server will bring it over.",
  completed: "Enjoy! Please settle your bill at the counter whenever you're ready.",
  cancelled: "This order was cancelled by the restaurant. Please speak to a server if you weren't expecting this.",
};

export default function OrderStatus() {
  const { id = "" } = useParams();
  const { backend, mode } = useApp();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!backend) return;
    try {
      const o = await backend.getOrder(id);
      setOrder(o);
      setError(null);
    } catch {
      setError("We couldn't refresh the order status just now. We'll keep trying.");
    }
  }, [backend, id]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  useEffect(() => {
    void load();
    if (!backend) return;
    const unsub = backend.subscribe(() => void load());
    const t = window.setInterval(() => void load(), 5000);
    return () => {
      unsub();
      window.clearInterval(t);
    };
  }, [backend, load]);

  const currentIdx = order ? STATUS_FLOW.indexOf(order.status) : -1;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[720px] px-4 pb-[calc(var(--sab)+32px)]">
      <header className="flex items-center gap-3 border-b border-ink/70 py-3">
        <Link to="/" aria-label="GUNI GUNI home">
          <Logo size={48} />
        </Link>
        <p className="cond text-[15px] font-medium tracking-[0.2em]">GUNI GUNI BISTRO</p>
        <Link to="/menu/pasta" className="kicker ml-auto inline-flex items-center gap-2 border border-ink px-3 py-2 font-semibold">
          Menu <Icon.ArrowRight size={12} />
        </Link>
      </header>

      {order === undefined && !error && <p className="py-16 text-center text-sm text-muted">Loading your order…</p>}

      {order === null && (
        <div className="py-16 text-center">
          <h1 className="display text-[40px]">Order not found.</h1>
          <p className="mt-3 text-sm text-muted">This order isn't in {mode === "demo" ? "this browser's demo storage" : "the restaurant's records"}.</p>
          <Link to="/menu/pasta" className="kicker mt-6 inline-flex items-center gap-2 bg-yellow px-5 py-3 font-bold">
            Back to the menu <Icon.ArrowRight size={12} />
          </Link>
        </div>
      )}

      {order && (
        <main className="anim-fade-in">
          <section className="pt-6 text-center">
            <p className="kicker text-muted">{order.status === "cancelled" ? "Order cancelled" : "Order received"}</p>
            <h1 className="display mt-2 text-[64px] leading-none sm:text-[84px]">{order.number}</h1>
            <p className="cond mt-2 text-[20px] font-medium uppercase tracking-[0.08em]">
              Table {order.tableNumber} <span className="mx-2 text-ink/40">·</span> {formatTime(order.createdAt)}
            </p>
            <div
              className={cn(
                "mx-auto mt-5 inline-flex max-w-full items-center gap-3 rounded-full px-5 py-2.5",
                order.status === "cancelled" ? "bg-red-100 text-red-800" : order.status === "submitted" ? "bg-ink text-cream" : "bg-yellow text-ink",
              )}
              role="status"
              aria-live="polite"
            >
              {order.status === "submitted" && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-yellow" aria-hidden />}
              {order.status !== "submitted" && order.status !== "cancelled" && <Icon.Check size={16} strokeWidth={3} />}
              <span className="cond text-[16px] font-medium uppercase tracking-[0.12em]">{STATUS_LABEL[order.status]}</span>
            </div>
            <p className="mx-auto mt-3 max-w-[420px] text-[13.5px] leading-relaxed text-ink/80">{STATUS_HINT[order.status]}</p>
          </section>

          {order.status !== "cancelled" && (
            <ol className="mt-8 grid grid-cols-5 gap-1" aria-label="Order progress">
              {STATUS_FLOW.map((s, i) => {
                const done = i <= currentIdx;
                const current = i === currentIdx;
                return (
                  <li key={s} className="text-center">
                    <div className={cn("h-1.5 w-full rounded-full", done ? "bg-ink" : "bg-ink/15", current && "bg-yellow")} aria-hidden />
                    <p className={cn("mt-2 text-[9px] uppercase leading-tight tracking-[0.14em]", done ? "text-ink" : "text-muted")} aria-current={current ? "step" : undefined}>
                      {s === "accepted" ? "Accepted" : STATUS_LABEL[s].replace("Order ", "")}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}

          <section className="mt-8 rounded-2xl border border-line bg-white/40 p-5">
            <h2 className="display text-[26px]">Your order.</h2>
            <ul className="mt-3 divide-y divide-line">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[15px]">
                      <span className="cond mr-2 font-medium">{l.qty}×</span>
                      {l.name}
                      {l.variant && <span className="ml-2 rounded-sm bg-yellow/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{l.variant}</span>}
                    </p>
                    {l.notes && <p className="mt-0.5 text-[12.5px] italic text-ink/70">“{l.notes}”</p>}
                  </div>
                  <span className="tabular-nums text-[15px]">{peso(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-ink pt-3 text-[14px]">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{peso(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Service charge (5%)</dt>
                <dd className="tabular-nums">{peso(order.serviceCharge)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2">
                <dt className="cond text-[17px] font-medium uppercase">Total</dt>
                <dd className="cond text-[20px] font-medium tabular-nums">{peso(order.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] text-muted">Dine-in · Please pay at the counter. A 5% service charge is included above.</p>
          </section>

          {error && <p className="mt-4 text-center text-[12px] text-red-700">{error}</p>}
          <BackendNotice mode={mode} className="mt-4" />

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/menu/pasta" className="kicker inline-flex items-center gap-2 bg-yellow px-5 py-3 font-bold">
              Order more <Icon.ArrowRight size={12} />
            </Link>
            <Link to="/" className="kicker inline-flex items-center gap-2 border border-ink px-5 py-3 font-semibold">
              Home
            </Link>
          </div>
        </main>
      )}
    </div>
  );
}
