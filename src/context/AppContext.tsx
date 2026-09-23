import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getItem, getServiceChargeRate, resolvePrice, subscribeMenu, type Variant } from "@/data/menu";
import { computeTotals, roundMoney, uid } from "@/lib/format";
import { resolveBackend, type Backend, type BackendMode } from "@/lib/backend";

export interface CartLine {
  lineId: string;
  itemId: string;
  variant: Variant | null;
  qty: number;
  notes: string;
}

export interface PricedCartLine extends CartLine {
  name: string;
  sectionTitle: string;
  unitPrice: number;
  lineTotal: number;
  unavailable: boolean;
}

interface SheetState {
  itemId: string;
  variant?: Variant | null;
  editLineId?: string;
}

interface Toast {
  id: number;
  message: string;
}

interface AppContextValue {
  // backend
  backend: Backend | null;
  mode: BackendMode | "checking";
  unavailable: Set<string>;
  refreshAvailability: () => Promise<void>;
  // cart
  lines: CartLine[];
  pricedLines: PricedCartLine[];
  itemCount: number;
  totals: { subtotal: number; serviceCharge: number; total: number };
  submissionKey: string;
  addLine: (line: Omit<CartLine, "lineId">) => void;
  updateLine: (lineId: string, patch: Partial<Omit<CartLine, "lineId" | "itemId">>) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  // ui
  sheet: SheetState | null;
  openItem: (itemId: string, opts?: { variant?: Variant | null; editLineId?: string }) => void;
  closeSheet: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  vegOnly: boolean;
  setVegOnly: (v: boolean) => void;
  toast: (message: string) => void;
  toasts: Toast[];
}

const AppContext = createContext<AppContextValue | null>(null);

const CART_KEY = "gg.cart.v1";

interface StoredCart {
  lines: CartLine[];
  submissionKey: string;
}

function loadCart(): StoredCart {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredCart;
      if (Array.isArray(parsed.lines)) {
        return { lines: parsed.lines.filter((l) => l && typeof l.itemId === "string"), submissionKey: parsed.submissionKey || uid("sub_") };
      }
    }
  } catch {
    /* ignore */
  }
  return { lines: [], submissionKey: uid("sub_") };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [mode, setMode] = useState<BackendMode | "checking">("checking");
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<StoredCart>(() => loadCart());
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const [menuVersion, setMenuVersion] = useState(0);
  useEffect(() => subscribeMenu(() => setMenuVersion((v) => v + 1)), []);

  // Resolve backend once
  useEffect(() => {
    let alive = true;
    resolveBackend().then((b) => {
      if (!alive) return;
      setBackend(b);
      setMode(b.mode);
    });
    return () => {
      alive = false;
    };
  }, []);

  const refreshAvailability = useCallback(async () => {
    if (!backend) return;
    try {
      const list = await backend.getAvailability();
      setUnavailable(new Set(list));
    } catch {
      /* keep last known */
    }
  }, [backend]);

  useEffect(() => {
    if (!backend) return;
    void refreshAvailability();
    const unsub = backend.subscribe(() => void refreshAvailability());
    const t = window.setInterval(() => void refreshAvailability(), 20000);
    return () => {
      unsub();
      window.clearInterval(t);
    };
  }, [backend, refreshAvailability]);

  // Persist cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore quota */
    }
  }, [cart]);

  const mutate = useCallback((fn: (lines: CartLine[]) => CartLine[]) => {
    setCart((c) => ({ lines: fn(c.lines), submissionKey: uid("sub_") }));
  }, []);

  const addLine = useCallback(
    (line: Omit<CartLine, "lineId">) => {
      mutate((lines) => {
        // merge identical lines (same item, variant and notes)
        const idx = lines.findIndex(
          (l) => l.itemId === line.itemId && l.variant === line.variant && l.notes.trim() === line.notes.trim(),
        );
        if (idx >= 0) {
          const next = [...lines];
          next[idx] = { ...next[idx], qty: Math.min(20, next[idx].qty + line.qty) };
          return next;
        }
        return [...lines, { ...line, lineId: uid("ln_") }];
      });
    },
    [mutate],
  );

  const updateLine = useCallback(
    (lineId: string, patch: Partial<Omit<CartLine, "lineId" | "itemId">>) => {
      mutate((lines) => lines.map((l) => (l.lineId === lineId ? { ...l, ...patch } : l)));
    },
    [mutate],
  );

  const removeLine = useCallback((lineId: string) => mutate((lines) => lines.filter((l) => l.lineId !== lineId)), [mutate]);
  const clearCart = useCallback(() => mutate(() => []), [mutate]);

  const pricedLines = useMemo<PricedCartLine[]>(() => {
    return cart.lines.flatMap((l) => {
      const entry = getItem(l.itemId);
      if (!entry) return [];
      const unitPrice = resolvePrice(entry.item, l.variant) ?? 0;
      return [
        {
          ...l,
          name: entry.item.name,
          sectionTitle: entry.section.title,
          unitPrice,
          lineTotal: roundMoney(unitPrice * l.qty),
          unavailable: unavailable.has(l.itemId),
        },
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.lines, unavailable, menuVersion]);

  const totals = useMemo(
    () => computeTotals(pricedLines.reduce((s, l) => s + l.lineTotal, 0), getServiceChargeRate()),
    [pricedLines],
  );
  const itemCount = useMemo(() => pricedLines.reduce((s, l) => s + l.qty, 0), [pricedLines]);

  const openItem = useCallback((itemId: string, opts?: { variant?: Variant | null; editLineId?: string }) => {
    setSheet({ itemId, variant: opts?.variant ?? null, editLineId: opts?.editLineId });
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const toast = useCallback((message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value: AppContextValue = {
    backend,
    mode,
    unavailable,
    refreshAvailability,
    lines: cart.lines,
    pricedLines,
    itemCount,
    totals,
    submissionKey: cart.submissionKey,
    addLine,
    updateLine,
    removeLine,
    clearCart,
    sheet,
    openItem,
    closeSheet,
    cartOpen,
    setCartOpen,
    vegOnly,
    setVegOnly,
    toast,
    toasts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
