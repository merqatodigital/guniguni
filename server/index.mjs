/**
 * GUNI GUNI Bistro — ordering + CMS server
 * -----------------------------------------
 * Zero-dependency Node.js (>=18) HTTP server with file-backed persistent storage.
 *
 *   node server/index.mjs
 *
 * Environment:
 *   PORT            default 8787
 *   STAFF_PIN       staff dashboard PIN (defaults to 1234 with a loud warning)
 *   ADMIN_PIN       backoffice PIN (defaults to STAFF_PIN)
 *   DATA_DIR        default ./server/data  (orders, site config, uploads, secrets)
 *   ALLOWED_ORIGIN  CORS origin (default "*", tighten for production)
 *
 * Also serves ../dist (the built site) and DATA_DIR/uploads so app, API and media share one origin.
 * Prices are ALWAYS recomputed here from the published menu (site.json) or src/data/menu.json.
 * The OpenRouter key lives in DATA_DIR/secrets.json and never leaves the server.
 * Product costs & recipes live in DATA_DIR/costing.json behind the admin-only API — they are
 * never part of the public site config, the menu pages or the AI agent's knowledge.
 */
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DIST_DIR = path.join(__dirname, "..", "dist");
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const STAFF_PIN = process.env.STAFF_PIN || "1234";
const ADMIN_PIN = process.env.ADMIN_PIN || "5309";
if (!process.env.STAFF_PIN) console.warn("\n[WARN] STAFF_PIN is not set — using development staff PIN 1234. Set STAFF_PIN before real use.");
if (!process.env.ADMIN_PIN) console.warn("[WARN] ADMIN_PIN is not set — using the default admin passkey 5309. Set ADMIN_PIN before going live.\n");

const FILE_MENU = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "data", "menu.json"), "utf8"));
const STATUS_LABEL = { submitted: "Order submitted", accepted: "Accepted by restaurant", preparing: "Preparing", ready: "Ready", completed: "Completed", cancelled: "Cancelled" };
const TRANSITIONS = { submitted: ["accepted", "cancelled"], accepted: ["preparing", "cancelled"], preparing: ["ready", "cancelled"], ready: ["completed", "cancelled"], completed: [], cancelled: [] };

/* ------------------------------ persistence ------------------------------ */
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const FILES = {
  orders: path.join(DATA_DIR, "orders.json"),
  availability: path.join(DATA_DIR, "availability.json"),
  meta: path.join(DATA_DIR, "meta.json"),
  site: path.join(DATA_DIR, "site.json"),
  secrets: path.join(DATA_DIR, "secrets.json"),
  costing: path.join(DATA_DIR, "costing.json"),
};
const readJSON = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const state = {
  orders: readJSON(FILES.orders, []),
  unavailable: new Set(readJSON(FILES.availability, [])),
  meta: readJSON(FILES.meta, { seq: 0, idempotency: {} }),
  site: readJSON(FILES.site, null),
  secrets: readJSON(FILES.secrets, {}),
  // Private costing & recipes — admin only, never served to the public /api/site endpoint.
  costing: readJSON(FILES.costing, { version: 1, currency: "PHP", updatedAt: new Date(0).toISOString(), items: {} }),
};
let writeChain = Promise.resolve();
function persist(kind) {
  const file = FILES[kind];
  const data =
    kind === "orders" ? state.orders : kind === "availability" ? Array.from(state.unavailable) : kind === "meta" ? state.meta : kind === "site" ? state.site : kind === "costing" ? state.costing : state.secrets;
  const payload = JSON.stringify(data, null, kind === "site" ? 0 : 2);
  writeChain = writeChain
    .then(async () => {
      const tmp = `${file}.${process.pid}.tmp`;
      await fsp.writeFile(tmp, payload, "utf8");
      await fsp.rename(tmp, file);
    })
    .catch((err) => console.error("[persist]", err));
  return writeChain;
}

/* --------------------------------- menu ---------------------------------- */
let ITEMS = new Map();
let SERVICE_RATE = 0.05;
function rebuildMenu() {
  const menu = state.site?.menu?.sections ? state.site.menu : FILE_MENU;
  SERVICE_RATE = typeof menu.serviceChargeRate === "number" ? menu.serviceChargeRate : 0.05;
  ITEMS = new Map();
  for (const section of menu.sections) for (const item of section.items) ITEMS.set(item.id, { item, section });
}
rebuildMenu();

/* ---------------------------------- auth --------------------------------- */
const tokens = new Map(); // token -> { issued, role }
const TOKEN_TTL = 12 * 60 * 60 * 1000;
const buckets = new Map(); // rate limiting: key -> { count, resetAt }
function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > b.resetAt) Object.assign(b, { count: 0, resetAt: now + windowMs });
  b.count += 1;
  buckets.set(key, b);
  return b.count > max;
}
function issueToken(role) {
  const t = crypto.randomBytes(24).toString("base64url");
  tokens.set(t, { issued: Date.now(), role });
  return t;
}
function tokenOf(req) {
  const h = req.headers.authorization || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const info = tokens.get(t);
  if (!info || Date.now() - info.issued > TOKEN_TTL) {
    tokens.delete(t);
    return null;
  }
  return info;
}
function requireRole(req, role) {
  const info = tokenOf(req);
  if (!info) throw new HttpError(401, "AUTH", "Please sign in again.");
  if (role === "admin" && info.role !== "admin") throw new HttpError(403, "AUTH", "Admin access required.");
  return info;
}
const safeEqual = (a, b) => typeof a === "string" && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* --------------------------------- helpers -------------------------------- */
class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const round = (n) => Math.round(n * 100) / 100;

function priceLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new HttpError(400, "VALIDATION", "Your order is empty.");
  if (lines.length > 40) throw new HttpError(400, "VALIDATION", "Too many lines in one order.");
  return lines.map((line) => {
    const entry = ITEMS.get(String(line?.itemId ?? ""));
    if (!entry) throw new HttpError(400, "VALIDATION", `Unknown menu item: ${line?.itemId}`);
    const { item, section } = entry;
    const needsVariant = Array.isArray(section.variants) && section.variants.length > 0;
    const variant = needsVariant ? line.variant : null;
    if (needsVariant && !section.variants.includes(variant)) throw new HttpError(400, "VALIDATION", `Please choose Glass or Bottle for ${item.name}.`);
    const unitPrice = needsVariant ? item.prices?.[variant] : item.price;
    if (typeof unitPrice !== "number") throw new HttpError(400, "VALIDATION", `No price found for ${item.name}.`);
    if (state.unavailable.has(item.id)) throw new HttpError(409, "UNAVAILABLE", `${item.name} is currently unavailable. Please remove it from your order.`);
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, "VALIDATION", `Quantity for ${item.name} must be between 1 and 20.`);
    const notes = String(line.notes ?? "").trim().slice(0, 200);
    return { itemId: item.id, variant, qty, notes, name: item.name, unitPrice, lineTotal: round(unitPrice * qty) };
  });
}

function createOrder(body) {
  const key = String(body?.idempotencyKey ?? "").slice(0, 80);
  if (key && state.meta.idempotency[key]) {
    const existing = state.orders.find((o) => o.id === state.meta.idempotency[key]);
    if (existing) return { order: existing, created: false };
  }
  const tableNumber = String(body?.tableNumber ?? "").trim();
  if (!tableNumber) throw new HttpError(400, "VALIDATION", "Please enter your table number.");
  if (tableNumber.length > 6) throw new HttpError(400, "VALIDATION", "Table number looks too long.");
  const lines = priceLines(body?.lines);
  const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
  const serviceCharge = round(subtotal * SERVICE_RATE);
  const total = round(subtotal + serviceCharge);
  const now = new Date().toISOString();
  state.meta.seq += 1;
  const order = { id: `ord_${crypto.randomBytes(9).toString("base64url")}`, number: `GG-${String(state.meta.seq).padStart(4, "0")}`, tableNumber, lines, subtotal, serviceCharge, total, status: "submitted", createdAt: now, updatedAt: now, history: [{ status: "submitted", at: now }] };
  state.orders.unshift(order);
  if (key) state.meta.idempotency[key] = order.id;
  const keys = Object.keys(state.meta.idempotency);
  if (keys.length > 5000) for (const k of keys.slice(0, keys.length - 5000)) delete state.meta.idempotency[k];
  persist("meta");
  persist("orders");
  return { order, created: true };
}

function updateStatus(id, status) {
  const order = state.orders.find((o) => o.id === id);
  if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
  if (!TRANSITIONS[order.status]?.includes(status)) throw new HttpError(409, "CONFLICT", `Cannot move an order from "${STATUS_LABEL[order.status]}" to "${STATUS_LABEL[status] ?? status}".`);
  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  order.history.push({ status, at: now });
  persist("orders");
  return order;
}

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, "TOO_LARGE", "Request too large."));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "BAD_JSON", "Invalid JSON body."));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body), "Cache-Control": "no-store" });
  res.end(body);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json", ".txt": "text/plain", ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime" };
const EXT_FOR_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };

function serveFile(res, file, cache) {
  res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": cache ? "public, max-age=31536000, immutable" : "no-cache" });
  fs.createReadStream(file).pipe(res);
}
function serveStatic(res, pathname) {
  if (pathname.startsWith("/uploads/")) {
    const file = path.join(UPLOAD_DIR, path.basename(decodeURIComponent(pathname)));
    if (!file.startsWith(UPLOAD_DIR) || !fs.existsSync(file)) return false;
    serveFile(res, file, true);
    return true;
  }
  let file = path.join(DIST_DIR, decodeURIComponent(pathname));
  if (!file.startsWith(DIST_DIR)) return false;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(file)) return false;
  serveFile(res, file, false);
  return true;
}

/* ------------------------------- OpenRouter ------------------------------- */
const OR = "https://openrouter.ai/api/v1";
function orHeaders() {
  return { Authorization: `Bearer ${state.secrets.openrouter}`, "Content-Type": "application/json", "HTTP-Referer": "https://guniguni.bistro", "X-Title": "GUNI GUNI Bistro" };
}
async function orChat({ model, messages, temperature = 0.4, maxTokens = 700 }) {
  const res = await fetch(`${OR}/chat/completions`, { method: "POST", headers: orHeaders(), body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(502, "OPENROUTER", data?.error?.message || `OpenRouter error ${res.status}`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new HttpError(502, "OPENROUTER", "OpenRouter returned no message content.");
  return content.trim();
}
async function agentTest(model) {
  if (!state.secrets.openrouter) return { ok: false, message: "No OpenRouter API key saved on the server.", latencyMs: 0, model };
  const t0 = Date.now();
  let keyMsg = "Key accepted.";
  try {
    const r = await fetch(`${OR}/auth/key`, { headers: orHeaders() });
    if (r.status === 401 || r.status === 403) return { ok: false, message: "OpenRouter rejected this API key.", latencyMs: Date.now() - t0, model };
    const d = await r.json().catch(() => ({}));
    if (d?.data?.label) keyMsg = `Key valid (${d.data.label})${typeof d.data.usage === "number" ? ` · used $${d.data.usage.toFixed(2)}` : ""}.`;
  } catch {
    /* continue with completion test */
  }
  try {
    const reply = await orChat({ model, messages: [{ role: "user", content: "Reply with the single word OK." }], maxTokens: 8, temperature: 0 });
    return { ok: true, message: `${keyMsg} Model replied “${reply.slice(0, 40)}”.`, latencyMs: Date.now() - t0, model };
  } catch (e) {
    return { ok: false, message: e.message, latencyMs: Date.now() - t0, model };
  }
}
function menuKnowledge(site) {
  const lines = [];
  for (const s of site.menu.sections) {
    lines.push(`## ${[s.group, s.title].filter(Boolean).join(" · ")}${s.subtitle ? ` (${s.subtitle})` : ""}${s.note ? ` — ${s.note}` : ""}`);
    for (const i of s.items) lines.push(`- ${i.name}${i.vegetarian ? " (vegetarian)" : ""}: ${i.prices ? `glass ₱${i.prices.glass} / bottle ₱${i.prices.bottle}` : `₱${i.price ?? "?"}`}${i.description ? ` — ${i.description}` : ""}`);
  }
  return lines.join("\n");
}
function buildSystemPrompt(site) {
  const a = site.agent;
  const f = site.footer ?? {};
  const c = f.contact ?? {};
  const l = f.location ?? {};
  const facts = [
    `Restaurant name: ${site.header?.brand ?? ""} ${site.header?.brandSub ?? ""}.`,
    f.serviceNote,
    c.phone && `Phone: ${c.phone}.`,
    c.email && `Email: ${c.email}${c.emailNote ? ` (${c.emailNote})` : ""}.`,
    c.supportNote && `${c.supportLabel || "Note"}: ${c.supportNote}.`,
    l.address && `Address: ${String(l.address).replace(/\s*\n\s*/g, ", ")}.`,
    l.hours && `${l.hoursLabel || "Hours"}: ${l.hours}.`,
    l.happyHour && `${l.happyHourLabel || "Happy hour"}: ${l.happyHour}.`,
    ...(f.social?.links ?? []).filter((x) => x.url).map((x) => `${x.label}: ${x.url}`),
    ...(f.reviews?.links ?? []).filter((x) => x.url).map((x) => `Reviews on ${x.label}: ${x.url}`),
  ].filter(Boolean);
  for (const sec of site.sections ?? []) {
    if (!sec.visible) continue;
    if (sec.type === "hours") facts.push(`Opening hours: ${sec.rows.map((r) => `${r.day} ${r.hours}`).join("; ")}. ${sec.note ?? ""}`);
    if (sec.type === "location") facts.push(`Location: ${String(sec.address).replace(/\n/g, ", ")}. ${sec.hours ? `Hours: ${sec.hours}.` : ""} ${sec.phone ? `Phone: ${sec.phone}.` : ""}`);
    if (sec.type === "faq") facts.push(`FAQ: ${sec.items.map((i) => `Q: ${i.q} A: ${i.a}`).join(" | ")}`);
  }
  const parts = [String(a.systemPrompt || "").trim(), "FACTS:\n" + facts.join("\n")];
  if (a.includeMenu) parts.push("MENU (prices in Philippine pesos):\n" + menuKnowledge(site));
  const kb = (a.knowledge ?? []).map((k) => `### ${k.name}\n${k.text}`).join("\n\n");
  if (kb) parts.push("KNOWLEDGE BASE:\n" + kb.slice(0, 40_000));
  parts.push(
    "PERSONA AND FORMATTING RULES:\nBe funny, witty, charming, and entertaining with clever banter, but ALWAYS completely informative and accurate. DO NOT use emojis. DO NOT use markdown symbols (no asterisks **, no dashes - at line starts, no hash headers ##). Output clean, readable plain text with clean line breaks.",
  );
  return parts.join("\n\n");
}

/* --------------------------------- router -------------------------------- */
async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { pathname } = url;
  const method = req.method || "GET";
  const ip = req.socket.remoteAddress || "?";

  if (pathname.startsWith("/api/")) {
    if (method === "GET" && pathname === "/api/health") {
      return send(res, 200, { ok: true, mode: "live", provider: "server", storage: "file", dataDir: DATA_DIR, staffPinConfigured: !!process.env.STAFF_PIN, adminPinConfigured: !!process.env.ADMIN_PIN, openrouterConfigured: !!state.secrets.openrouter, sitePublished: !!state.site });
    }
    if (method === "GET" && pathname === "/api/menu/availability") return send(res, 200, { unavailable: Array.from(state.unavailable) });
    if (method === "GET" && pathname === "/api/site") return send(res, 200, { site: state.site });

    if (method === "POST" && pathname === "/api/orders") {
      if (limited(`order:${ip}`, 30, 10 * 60_000)) throw new HttpError(429, "RATE_LIMIT", "Too many orders from this device. Please ask a server.");
      const { order, created } = createOrder(await readBody(req));
      console.log(`[order] ${created ? "NEW" : "DUPLICATE"} ${order.number} table ${order.tableNumber} total ${order.total}`);
      return send(res, created ? 201 : 200, { order });
    }
    const orderMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9_-]+)$/);
    if (method === "GET" && orderMatch) {
      const order = state.orders.find((o) => o.id === orderMatch[1]);
      if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
      return send(res, 200, { order });
    }

    if (method === "POST" && pathname === "/api/staff/login") {
      if (limited(`login:${ip}`, 10, 15 * 60_000)) throw new HttpError(429, "RATE_LIMIT", "Too many attempts. Try again in a few minutes.");
      const body = await readBody(req);
      const pin = typeof body.pin === "string" ? body.pin : "";
      if (safeEqual(pin, ADMIN_PIN)) return send(res, 200, { token: issueToken("admin"), role: "admin" });
      if (safeEqual(pin, STAFF_PIN)) return send(res, 200, { token: issueToken("staff"), role: "staff" });
      throw new HttpError(401, "AUTH", "Incorrect PIN.");
    }

    if (method === "POST" && pathname === "/api/agent/chat") {
      const info = tokenOf(req);
      if (!info && limited(`chat:${ip}`, 30, 10 * 60_000)) throw new HttpError(429, "RATE_LIMIT", "Too many messages — please slow down.");
      const body = await readBody(req, 300_000);
      const site = state.site;
      if (!state.secrets.openrouter) throw new HttpError(503, "AGENT_NOT_CONFIGURED", "The assistant isn't set up yet (no OpenRouter key on the server).");
      const override = info?.role === "admin" && body.override && typeof body.override === "object" ? body.override : null;
      if (!site && !override) throw new HttpError(503, "AGENT_NOT_CONFIGURED", "Publish the site once so the assistant has a menu to work from.");
      if (site && !site.agent?.enabled && !override) throw new HttpError(503, "AGENT_DISABLED", "The assistant is switched off.");
      const messages = (Array.isArray(body.messages) ? body.messages : []).filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string").slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
      if (messages.length === 0) throw new HttpError(400, "VALIDATION", "No message.");
      const systemPrompt = override?.systemPrompt ? String(override.systemPrompt).slice(0, 120_000) : buildSystemPrompt(site);
      const model = String(override?.model || site?.agent?.model || "openrouter/free");
      const temperature = Number(override?.temperature ?? site?.agent?.temperature ?? 0.4);
      const reply = await orChat({ model, messages: [{ role: "system", content: systemPrompt }, ...messages], temperature });
      return send(res, 200, { reply });
    }

    if (pathname.startsWith("/api/staff/")) {
      requireRole(req, "staff");
      if (method === "GET" && pathname === "/api/staff/orders") return send(res, 200, { orders: state.orders.slice(0, 500) });
      const m = pathname.match(/^\/api\/staff\/orders\/([A-Za-z0-9_-]+)$/);
      if (method === "PATCH" && m) {
        const body = await readBody(req);
        if (!Object.hasOwn(TRANSITIONS, String(body.status))) throw new HttpError(400, "VALIDATION", "Unknown status.");
        const order = updateStatus(m[1], body.status);
        console.log(`[order] ${order.number} -> ${order.status}`);
        return send(res, 200, { order });
      }
      if (method === "PUT" && pathname === "/api/staff/availability") {
        const body = await readBody(req);
        if (!ITEMS.has(String(body.itemId))) throw new HttpError(400, "VALIDATION", "Unknown item.");
        if (body.available) state.unavailable.delete(body.itemId);
        else state.unavailable.add(body.itemId);
        persist("availability");
        return send(res, 200, { unavailable: Array.from(state.unavailable) });
      }
    }

    if (pathname.startsWith("/api/admin/")) {
      requireRole(req, "admin");
      if (method === "PUT" && pathname === "/api/admin/site") {
        const body = await readBody(req, 25 * 1024 * 1024);
        const site = body.site;
        if (!site || typeof site !== "object" || !Array.isArray(site?.menu?.sections) || !site.theme || !site.header) throw new HttpError(400, "VALIDATION", "Malformed site configuration.");
        site.updatedAt = new Date().toISOString();
        state.site = site;
        rebuildMenu();
        await persist("site");
        console.log(`[site] published (${ITEMS.size} menu items, ${Object.keys(site.media ?? {}).length} media refs)`);
        return send(res, 200, { site });
      }
      if (method === "POST" && pathname === "/api/admin/media") {
        const body = await readBody(req, 120 * 1024 * 1024);
        const m = String(body.dataUrl ?? "").match(/^data:([\w/+.-]+);base64,(.+)$/s);
        if (!m) throw new HttpError(400, "VALIDATION", "Expected a base64 data URL.");
        const mime = m[1];
        const ext = EXT_FOR_MIME[mime] || (String(body.name ?? "").split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const kind = body.kind === "video" || mime.startsWith("video/") ? "video" : "image";
        const safeKey = String(body.key ?? "media").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
        const filename = `${safeKey}-${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}.${ext}`;
        await fsp.writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(m[2], "base64"));
        // remove older uploads for the same key to keep the folder tidy
        const samePrefix = new RegExp(`^${safeKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-[a-z0-9]{6,24}\\.\\w+$`);
        for (const f of await fsp.readdir(UPLOAD_DIR)) if (f !== filename && samePrefix.test(f)) await fsp.unlink(path.join(UPLOAD_DIR, f)).catch(() => {});
        return send(res, 201, { asset: { url: `/uploads/${filename}`, kind, name: String(body.name ?? filename).slice(0, 120) } });
      }
      if (method === "GET" && pathname === "/api/admin/costing") return send(res, 200, { costing: state.costing });
      if (method === "PUT" && pathname === "/api/admin/costing") {
        const body = await readBody(req, 8 * 1024 * 1024);
        const costing = body.costing;
        if (!costing || typeof costing !== "object" || typeof costing.items !== "object") throw new HttpError(400, "VALIDATION", "Malformed costing data.");
        costing.updatedAt = new Date().toISOString();
        state.costing = costing;
        await persist("costing");
        console.log(`[costing] saved (${Object.keys(costing.items).length} products)`);
        return send(res, 200, { costing });
      }
      if (method === "GET" && pathname === "/api/admin/secrets") {
        const k = state.secrets.openrouter || "";
        return send(res, 200, { openrouter: { configured: !!k, hint: k ? `…${k.slice(-4)} (server)` : "" } });
      }
      if (method === "PUT" && pathname === "/api/admin/secrets") {
        const body = await readBody(req);
        if (body.name !== "openrouter") throw new HttpError(400, "VALIDATION", "Unknown secret.");
        const value = String(body.value ?? "").trim();
        if (value) state.secrets.openrouter = value;
        else delete state.secrets.openrouter;
        await persist("secrets");
        const k = state.secrets.openrouter || "";
        return send(res, 200, { openrouter: { configured: !!k, hint: k ? `…${k.slice(-4)} (server)` : "" } });
      }
      if (method === "POST" && pathname === "/api/admin/agent/test") {
        const body = await readBody(req);
        return send(res, 200, await agentTest(String(body.model || state.site?.agent?.model || "openrouter/free")));
      }
    }
    throw new HttpError(404, "NOT_FOUND", "No such endpoint.");
  }

  if (method === "GET" && serveStatic(res, pathname)) return;
  send(res, 404, { code: "NOT_FOUND", message: "Not found. Build the site (npm run build) to serve it from here." });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  try {
    await handle(req, res);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { code: err.code, message: err.message });
    console.error(err);
    send(res, 500, { code: "SERVER_ERROR", message: "Something went wrong on the server." });
  }
});

server.listen(PORT, () => {
  console.log(`GUNI GUNI server listening on http://localhost:${PORT}`);
  console.log(`Data directory: ${DATA_DIR} (orders, site.json, secrets.json, uploads/)`);
  console.log(state.site ? "Site config: published copy loaded" : "Site config: none yet — publish from /#/admin");
  console.log(fs.existsSync(DIST_DIR) ? `Serving built site from ${DIST_DIR}` : "dist/ not found — run `npm run build` to serve the site from here.");
});
