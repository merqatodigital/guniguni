export function peso(amount: number, opts: { decimals?: boolean } = {}): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  const decimals = opts.decimals ?? hasCents;
  const n = amount.toLocaleString("en-PH", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
  return `₱${n}`;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeTotals(subtotal: number, rate: number) {
  const serviceCharge = roundMoney(subtotal * rate);
  const total = roundMoney(subtotal + serviceCharge);
  return { subtotal: roundMoney(subtotal), serviceCharge, total };
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min ago`;
}

export function uid(prefix = ""): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return prefix + rnd;
}
