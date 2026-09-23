import { getItem, getServiceChargeRate, resolvePrice, type Variant } from "@/data/menu";
import type { CostingData } from "@/data/costing";
import { EMPTY_COSTING } from "@/data/costing";
import type { MediaAsset, MediaKind, SiteConfig } from "@/data/site";
import { computeTotals, roundMoney, uid } from "@/lib/format";
import { blobToDataUrl, idbPut, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, processImage } from "@/lib/media";
import { buildSystemPrompt, chatCompletion, runAgentTest, type ChatMessage } from "@/lib/openrouter";

export type OrderStatus = "submitted" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  submitted: "Order submitted",
  accepted: "Accepted by restaurant",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const STATUS_FLOW: OrderStatus[] = ["submitted", "accepted", "preparing", "ready", "completed"];

export interface OrderLineInput {
  itemId: string;
  variant?: Variant | null;
  qty: number;
  notes?: string;
}
export interface OrderLine extends OrderLineInput {
  name: string;
  unitPrice: number;
  lineTotal: number;
}
export interface Order {
  id: string;
  number: string;
  tableNumber: string;
  lines: OrderLine[];
  subtotal: number;
  serviceCharge: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  history: { status: OrderStatus; at: string }[];
}
export interface SubmitPayload {
  idempotencyKey: string;
  tableNumber: string;
  lines: OrderLineInput[];
}

export type BackendMode = "live" | "demo";
export type BackendProvider = "server" | "supabase" | "demo";
export type AuthKind = "pin" | "password";
export type Role = "staff" | "admin";
export interface LoginCredentials {
  pin?: string;
  email?: string;
  password?: string;
}
export interface LoginResult {
  token: string;
  role: Role;
}
export interface SecretStatus {
  configured: boolean;
  hint: string;
  managedExternally?: boolean;
  instructions?: string;
}
export interface AgentTestResult {
  ok: boolean;
  message: string;
  latencyMs: number;
  model: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface Backend {
  readonly mode: BackendMode;
  readonly provider: BackendProvider;
  readonly authKind: AuthKind;
  readonly description: string;
  // ordering
  getAvailability(): Promise<string[]>;
  submitOrder(payload: SubmitPayload): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  // staff
  staffLogin(credentials: LoginCredentials): Promise<LoginResult>;
  staffOrders(token: string): Promise<Order[]>;
  staffUpdateStatus(token: string, id: string, status: OrderStatus): Promise<Order>;
  staffSetAvailability(token: string, itemId: string, available: boolean): Promise<string[]>;
  // site content (admin)
  getSite(): Promise<SiteConfig | null>;
  saveSite(token: string, site: SiteConfig): Promise<SiteConfig>;
  uploadMedia(token: string, key: string, file: Blob, meta: { name: string; kind: MediaKind }): Promise<MediaAsset>;
  /** Private costing & recipes — admin only, never part of the public site config. */
  getCosting(token: string): Promise<CostingData>;
  saveCosting(token: string, costing: CostingData): Promise<CostingData>;
  // secrets & AI agent
  getSecretStatus(token: string): Promise<SecretStatus>;
  setSecret(token: string, value: string): Promise<SecretStatus>;
  agentTest(token: string, model: string): Promise<AgentTestResult>;
  agentChat(messages: ChatMessage[], site: SiteConfig, adminToken?: string, extraSystem?: string): Promise<string>;
  subscribe(cb: () => void): () => void;
}

/* ------------------------------------------------------------------ */
/* Shared validation (mirrored in server/index.mjs and the edge fn)     */
/* ------------------------------------------------------------------ */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  submitted: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function priceLines(lines: OrderLineInput[], unavailable: Set<string>): OrderLine[] {
  if (!Array.isArray(lines) || lines.length === 0) throw new ApiError("VALIDATION", "Your order is empty.");
  if (lines.length > 40) throw new ApiError("VALIDATION", "Too many lines in one order.");
  return lines.map((line) => {
    const entry = getItem(line.itemId);
    if (!entry) throw new ApiError("VALIDATION", `Unknown menu item: ${line.itemId}`);
    const { item, section } = entry;
    const needsVariant = !!section.variants?.length;
    const variant = needsVariant ? line.variant : null;
    if (needsVariant && (!variant || !section.variants!.includes(variant))) {
      throw new ApiError("VALIDATION", `Please choose Glass or Bottle for ${item.name}.`);
    }
    const unitPrice = resolvePrice(item, variant);
    if (unitPrice == null) throw new ApiError("VALIDATION", `No price found for ${item.name}.`);
    if (unavailable.has(item.id)) throw new ApiError("UNAVAILABLE", `${item.name} is currently unavailable. Please remove it from your order.`);
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new ApiError("VALIDATION", `Quantity for ${item.name} must be between 1 and 20.`);
    const notes = (line.notes ?? "").toString().trim().slice(0, 200);
    return { itemId: item.id, variant, qty, notes, name: item.name, unitPrice, lineTotal: roundMoney(unitPrice * qty) };
  });
}

export function validateTable(table: string): string {
  const t = (table ?? "").toString().trim();
  if (!t) throw new ApiError("VALIDATION", "Please enter your table number.");
  if (t.length > 6) throw new ApiError("VALIDATION", "Table number looks too long.");
  return t;
}

export function summarize(lines: OrderLine[]) {
  return computeTotals(
    lines.reduce((s, l) => s + l.lineTotal, 0),
    getServiceChargeRate(),
  );
}

/* ------------------------------------------------------------------ */
/* Live HTTP backend (server/index.mjs)                                 */
/* ------------------------------------------------------------------ */
export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? (import.meta.env.DEV ? "http://localhost:8787" : "");

async function request<T>(path: string, init: { method?: string; body?: unknown; token?: string; timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json", ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}) },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: ctrl.signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new ApiError(data.code ?? "HTTP_ERROR", data.message ?? `Request failed (${res.status})`, res.status);
    return data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("NETWORK", "We couldn't reach the restaurant server. Nothing was lost — please try again.", 0);
  } finally {
    clearTimeout(timer);
  }
}

class HttpBackend implements Backend {
  readonly mode = "live" as const;
  readonly provider = "server" as const;
  readonly authKind = "pin" as const;
  readonly description = `Restaurant server${API_BASE ? ` at ${API_BASE}` : ""} · file storage`;

  async getAvailability() {
    return (await request<{ unavailable: string[] }>("/api/menu/availability")).unavailable;
  }
  async submitOrder(payload: SubmitPayload) {
    return (await request<{ order: Order }>("/api/orders", { method: "POST", body: payload })).order;
  }
  async getOrder(id: string) {
    try {
      return (await request<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}`)).order;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }
  async staffLogin(c: LoginCredentials) {
    return request<LoginResult>("/api/staff/login", { method: "POST", body: { pin: c.pin } });
  }
  async staffOrders(token: string) {
    return (await request<{ orders: Order[] }>("/api/staff/orders", { token })).orders;
  }
  async staffUpdateStatus(token: string, id: string, status: OrderStatus) {
    return (await request<{ order: Order }>(`/api/staff/orders/${encodeURIComponent(id)}`, { method: "PATCH", body: { status }, token })).order;
  }
  async staffSetAvailability(token: string, itemId: string, available: boolean) {
    return (await request<{ unavailable: string[] }>("/api/staff/availability", { method: "PUT", body: { itemId, available }, token })).unavailable;
  }
  async getSite() {
    return (await request<{ site: SiteConfig | null }>("/api/site")).site;
  }
  async saveSite(token: string, site: SiteConfig) {
    return (await request<{ site: SiteConfig }>("/api/admin/site", { method: "PUT", body: { site }, token, timeoutMs: 60000 })).site;
  }
  async uploadMedia(token: string, key: string, file: Blob, meta: { name: string; kind: MediaKind }) {
    const blob = meta.kind === "image" && file instanceof File ? await processImage(file) : file;
    const dataUrl = await blobToDataUrl(blob);
    return (await request<{ asset: MediaAsset }>("/api/admin/media", { method: "POST", body: { key, name: meta.name, kind: meta.kind, dataUrl }, token, timeoutMs: 120000 })).asset;
  }
  async getCosting(token: string) {
    return (await request<{ costing: CostingData }>("/api/admin/costing", { token })).costing;
  }
  async saveCosting(token: string, costing: CostingData) {
    return (await request<{ costing: CostingData }>("/api/admin/costing", { method: "PUT", body: { costing }, token, timeoutMs: 30000 })).costing;
  }
  async getSecretStatus(token: string) {
    return (await request<{ openrouter: SecretStatus }>("/api/admin/secrets", { token })).openrouter;
  }
  async setSecret(token: string, value: string) {
    return (await request<{ openrouter: SecretStatus }>("/api/admin/secrets", { method: "PUT", body: { name: "openrouter", value }, token })).openrouter;
  }
  async agentTest(token: string, model: string) {
    return request<AgentTestResult>("/api/admin/agent/test", { method: "POST", body: { model }, token, timeoutMs: 45000 });
  }
  async agentChat(messages: ChatMessage[], site: SiteConfig, adminToken?: string, extraSystem?: string) {
    const override =
      extraSystem || adminToken
        ? { model: site.agent.model, temperature: site.agent.temperature, systemPrompt: extraSystem || buildSystemPrompt(site) }
        : undefined;
    return (await request<{ reply: string }>("/api/agent/chat", { method: "POST", body: { messages, override }, token: adminToken, timeoutMs: 60000 })).reply;
  }
  subscribe() {
    return () => {};
  }
}

/* ------------------------------------------------------------------ */
/* Demo backend — browser storage only, clearly labelled in the UI      */
/* ------------------------------------------------------------------ */
const DEMO = {
  orders: "gg.demo.orders",
  unavailable: "gg.demo.unavailable",
  seq: "gg.demo.seq",
  idem: "gg.demo.idem",
  site: "gg.site.published",
  costing: "gg.costing",
  secret: "gg.secrets.openrouter",
  adminToken: "demo-admin-token",
  staffToken: "demo-staff-token",
  staffPin: "1234",
  adminPin: "5309",
};
const DEMO_EVENT = "gg-demo-change";
/** Staff dashboard PIN in demo mode. The admin passkey is intentionally not surfaced in the UI. */
export const DEMO_PIN = DEMO.staffPin;
export const DEMO_SECRET_KEY = DEMO.secret;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(DEMO_EVENT));
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class DemoBackend implements Backend {
  readonly mode = "demo" as const;
  readonly provider = "demo" as const;
  readonly authKind = "pin" as const;
  readonly description = "Demo storage — this browser only";

  async getAvailability() {
    return readJSON<string[]>(DEMO.unavailable, []);
  }
  async submitOrder(payload: SubmitPayload) {
    await wait(350);
    const idem = readJSON<Record<string, string>>(DEMO.idem, {});
    const orders = readJSON<Order[]>(DEMO.orders, []);
    if (payload.idempotencyKey && idem[payload.idempotencyKey]) {
      const existing = orders.find((o) => o.id === idem[payload.idempotencyKey]);
      if (existing) return existing;
    }
    const tableNumber = validateTable(payload.tableNumber);
    const lines = priceLines(payload.lines, new Set(readJSON<string[]>(DEMO.unavailable, [])));
    const totals = summarize(lines);
    const seq = readJSON<number>(DEMO.seq, 0) + 1;
    const now = new Date().toISOString();
    const order: Order = { id: uid("ord_"), number: `GG-${String(seq).padStart(4, "0")}`, tableNumber, lines, ...totals, status: "submitted", createdAt: now, updatedAt: now, history: [{ status: "submitted", at: now }] };
    orders.unshift(order);
    localStorage.setItem(DEMO.seq, JSON.stringify(seq));
    if (payload.idempotencyKey) {
      idem[payload.idempotencyKey] = order.id;
      localStorage.setItem(DEMO.idem, JSON.stringify(idem));
    }
    writeJSON(DEMO.orders, orders);
    return order;
  }
  async getOrder(id: string) {
    return readJSON<Order[]>(DEMO.orders, []).find((o) => o.id === id) ?? null;
  }
  async staffLogin(c: LoginCredentials): Promise<LoginResult> {
    await wait(200);
    const pin = (c.pin ?? "").trim();
    if (pin === DEMO.adminPin) return { token: DEMO.adminToken, role: "admin" };
    if (pin === DEMO.staffPin) return { token: DEMO.staffToken, role: "staff" };
    throw new ApiError("AUTH", "Incorrect passkey.", 401);
  }
  private assert(token: string) {
    if (token !== DEMO.adminToken && token !== DEMO.staffToken) throw new ApiError("AUTH", "Please sign in again.", 401);
  }
  private assertAdmin(token: string) {
    if (token !== DEMO.adminToken) throw new ApiError("AUTH", "Admin access required — sign in with the admin passkey.", 403);
  }
  async staffOrders(token: string) {
    this.assert(token);
    return readJSON<Order[]>(DEMO.orders, []);
  }
  async staffUpdateStatus(token: string, id: string, status: OrderStatus) {
    this.assert(token);
    const orders = readJSON<Order[]>(DEMO.orders, []);
    const order = orders.find((o) => o.id === id);
    if (!order) throw new ApiError("NOT_FOUND", "Order not found.", 404);
    if (!ALLOWED_TRANSITIONS[order.status].includes(status)) {
      throw new ApiError("CONFLICT", `Cannot move an order from "${STATUS_LABEL[order.status]}" to "${STATUS_LABEL[status]}".`, 409);
    }
    const now = new Date().toISOString();
    order.status = status;
    order.updatedAt = now;
    order.history.push({ status, at: now });
    writeJSON(DEMO.orders, orders);
    return order;
  }
  async staffSetAvailability(token: string, itemId: string, available: boolean) {
    this.assert(token);
    if (!getItem(itemId)) throw new ApiError("VALIDATION", "Unknown item.");
    const set = new Set(readJSON<string[]>(DEMO.unavailable, []));
    if (available) set.delete(itemId);
    else set.add(itemId);
    const list = Array.from(set);
    writeJSON(DEMO.unavailable, list);
    return list;
  }
  async getSite() {
    return readJSON<SiteConfig | null>(DEMO.site, null);
  }
  async saveSite(token: string, site: SiteConfig) {
    this.assertAdmin(token);
    await wait(250);
    try {
      writeJSON(DEMO.site, site);
    } catch {
      throw new ApiError("STORAGE", "Browser storage is full. Remove pasted data-URL media or connect the server / Supabase for real storage.", 507);
    }
    return site;
  }
  async uploadMedia(token: string, key: string, file: Blob, meta: { name: string; kind: MediaKind }): Promise<MediaAsset> {
    this.assertAdmin(token);
    if (meta.kind === "video" && file.size > MAX_VIDEO_BYTES) throw new ApiError("TOO_LARGE", "Videos up to 80 MB in demo mode.");
    if (meta.kind === "image" && file.size > MAX_IMAGE_BYTES) throw new ApiError("TOO_LARGE", "Images up to 25 MB.");
    const blob = meta.kind === "image" && file instanceof File ? await processImage(file) : file;
    await idbPut(key, blob);
    return { url: `idb:${key}`, kind: meta.kind, name: meta.name };
  }
  async getCosting(token: string) {
    this.assertAdmin(token);
    return readJSON<CostingData>(DEMO.costing, EMPTY_COSTING);
  }
  async saveCosting(token: string, costing: CostingData) {
    this.assertAdmin(token);
    await wait(150);
    try {
      writeJSON(DEMO.costing, costing);
    } catch {
      throw new ApiError("STORAGE", "Browser storage is full — export your costing sheet and connect the server or Supabase.", 507);
    }
    return costing;
  }
  async getSecretStatus(token: string): Promise<SecretStatus> {
    this.assertAdmin(token);
    const key = localStorage.getItem(DEMO.secret) ?? "";
    return { configured: !!key, hint: key ? `…${key.slice(-4)} (stored only in this browser)` : "" };
  }
  async setSecret(token: string, value: string) {
    this.assertAdmin(token);
    if (value) localStorage.setItem(DEMO.secret, value);
    else localStorage.removeItem(DEMO.secret);
    return this.getSecretStatus(token);
  }
  async agentTest(token: string, model: string) {
    this.assertAdmin(token);
    const key = localStorage.getItem(DEMO.secret);
    if (!key) return { ok: false, message: "No OpenRouter API key saved yet.", latencyMs: 0, model };
    return runAgentTest(key, model);
  }
  async agentChat(messages: ChatMessage[], site: SiteConfig, _token?: string, extraSystem?: string) {
    const key = localStorage.getItem(DEMO.secret);
    if (!key) throw new ApiError("AGENT_NOT_CONFIGURED", "The assistant isn't configured on this device yet (demo mode keeps the API key in this browser only).");
    return chatCompletion(key, {
      model: site.agent.model,
      temperature: site.agent.temperature,
      messages: [{ role: "system", content: extraSystem || buildSystemPrompt(site) }, ...messages.slice(-12)],
    });
  }
  subscribe(cb: () => void) {
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("gg.demo.") || e.key === DEMO.site) cb();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DEMO_EVENT, cb);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DEMO_EVENT, cb);
    };
  }
}

/* ------------------------------------------------------------------ */
/* Resolution: Supabase → restaurant server → labelled demo store       */
/* ------------------------------------------------------------------ */
export const SUPABASE_ENV = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "",
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
};

export const SUPABASE_HOST: string = (() => {
  try {
    return SUPABASE_ENV.url ? new URL(SUPABASE_ENV.url).hostname : "";
  } catch {
    return SUPABASE_ENV.url;
  }
})();

export async function resolveBackend(): Promise<Backend> {
  if (SUPABASE_ENV.url && SUPABASE_ENV.anonKey) {
    try {
      const { createSupabaseBackend } = await import("./supabaseBackend");
      return createSupabaseBackend(SUPABASE_ENV.url, SUPABASE_ENV.anonKey);
    } catch (e) {
      console.error("[backend] Supabase client failed to initialise, falling back:", e);
    }
  }
  try {
    const health = await request<{ ok: boolean }>("/api/health", { timeoutMs: 2500 });
    if (health?.ok) return new HttpBackend();
  } catch {
    /* fall through */
  }
  return new DemoBackend();
}
