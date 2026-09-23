// Supabase Edge Function: place-order
// Validates every line against the PUBLISHED menu in site_config, checks availability,
// computes totals server-side and stores the order with the service role.
// Deploy:  supabase functions deploy place-order
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}
const round = (n: number) => Math.round(n * 100) / 100;

type Variant = "glass" | "bottle";
interface MenuItem { id: string; name: string; price?: number; prices?: Record<Variant, number> }
interface MenuSection { id: string; variants?: Variant[]; items: MenuItem[] }
interface LineInput { itemId?: string; variant?: Variant | null; qty?: number; notes?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "METHOD", message: "POST only" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const idem = String(body.idempotencyKey ?? "").slice(0, 80) || null;

    if (idem) {
      const { data: existing } = await admin.from("orders").select("data").eq("idempotency_key", idem).maybeSingle();
      if (existing) return json({ order: existing.data }, 200);
    }

    const tableNumber = String(body.tableNumber ?? "").trim();
    if (!tableNumber) throw new HttpError(400, "VALIDATION", "Please enter your table number.");
    if (tableNumber.length > 6) throw new HttpError(400, "VALIDATION", "Table number looks too long.");

    const { data: siteRow } = await admin.from("site_config").select("config").eq("id", "live").maybeSingle();
    const menu = siteRow?.config?.menu as { serviceChargeRate?: number; sections?: MenuSection[] } | undefined;
    if (!menu?.sections) throw new HttpError(503, "SETUP", "The menu isn't published yet — open /#/admin and Publish once.");
    const rate = typeof menu.serviceChargeRate === "number" ? menu.serviceChargeRate : 0.05;

    const items = new Map<string, { item: MenuItem; section: MenuSection }>();
    for (const s of menu.sections) for (const i of s.items) items.set(i.id, { item: i, section: s });
    const { data: offRows } = await admin.from("item_availability").select("item_id").eq("available", false);
    const unavailable = new Set((offRows ?? []).map((r: { item_id: string }) => r.item_id));

    const inputs: LineInput[] = Array.isArray(body.lines) ? body.lines : [];
    if (inputs.length === 0) throw new HttpError(400, "VALIDATION", "Your order is empty.");
    if (inputs.length > 40) throw new HttpError(400, "VALIDATION", "Too many lines in one order.");

    const lines = inputs.map((line) => {
      const entry = items.get(String(line.itemId ?? ""));
      if (!entry) throw new HttpError(400, "VALIDATION", `Unknown menu item: ${line.itemId}`);
      const { item, section } = entry;
      const needsVariant = Array.isArray(section.variants) && section.variants.length > 0;
      const variant = needsVariant ? line.variant ?? null : null;
      if (needsVariant && (!variant || !section.variants!.includes(variant))) throw new HttpError(400, "VALIDATION", `Please choose Glass or Bottle for ${item.name}.`);
      const unitPrice = needsVariant ? item.prices?.[variant as Variant] : item.price;
      if (typeof unitPrice !== "number") throw new HttpError(400, "VALIDATION", `No price found for ${item.name}.`);
      if (unavailable.has(item.id)) throw new HttpError(409, "UNAVAILABLE", `${item.name} is currently unavailable. Please remove it from your order.`);
      const qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) throw new HttpError(400, "VALIDATION", `Quantity for ${item.name} must be between 1 and 20.`);
      return { itemId: item.id, variant, qty, notes: String(line.notes ?? "").trim().slice(0, 200), name: item.name, unitPrice, lineTotal: round(unitPrice * qty) };
    });

    const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
    const serviceCharge = round(subtotal * rate);
    const total = round(subtotal + serviceCharge);
    const now = new Date().toISOString();
    const { data: number } = await admin.rpc("next_order_number");
    const id = `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 14)}`;
    const order = { id, number, tableNumber, lines, subtotal, serviceCharge, total, status: "submitted", createdAt: now, updatedAt: now, history: [{ status: "submitted", at: now }] };

    const { error } = await admin.from("orders").insert({ id, number, table_number: tableNumber, status: "submitted", total, idempotency_key: idem, data: order, created_at: now, updated_at: now });
    if (error) {
      if (error.code === "23505" && idem) {
        const { data: existing } = await admin.from("orders").select("data").eq("idempotency_key", idem).maybeSingle();
        if (existing) return json({ order: existing.data }, 200);
      }
      throw new HttpError(500, "DB", error.message);
    }
    return json({ order }, 201);
  } catch (e) {
    if (e instanceof HttpError) return json({ code: e.code, message: e.message }, e.status);
    console.error(e);
    return json({ code: "SERVER_ERROR", message: "Something went wrong while saving the order." }, 500);
  }
});
