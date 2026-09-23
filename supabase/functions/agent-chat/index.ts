// Supabase Edge Function: agent-chat
// Proxies the site's AI host to OpenRouter so the API key never reaches the browser.
//   { action: "status" }                      -> { configured }
//   { action: "test", model }   (admin only)  -> { ok, message, latencyMs, model }
//   { action: "chat", messages, override? }   -> { reply }   (override honoured for admins only)
// Deploy:  supabase functions deploy agent-chat
// Secret:  supabase secrets set OPENROUTER_API_KEY=sk-or-…
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const OR = "https://openrouter.ai/api/v1";
const KEY = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const headers = () => ({ Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://guniguni.bistro", "X-Title": "GUNI GUNI Bistro" });

type Msg = { role: "system" | "user" | "assistant"; content: string };
const rate = new Map<string, { count: number; resetAt: number }>();

async function chat(model: string, messages: Msg[], temperature = 0.4, maxTokens = 700): Promise<string> {
  const res = await fetch(`${OR}/chat/completions`, { method: "POST", headers: headers(), body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `OpenRouter error ${res.status}`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenRouter returned no message content.");
  return content.trim();
}

// deno-lint-ignore no-explicit-any
function buildSystemPrompt(site: any): string {
  const a = site.agent ?? {};
  const f = site.footer ?? {};
  const c = f.contact ?? {};
  const l = f.location ?? {};
  const facts: string[] = [
    `Restaurant name: ${site.header?.brand} ${site.header?.brandSub}.`,
    f.serviceNote,
    c.phone && `Phone: ${c.phone}.`,
    c.email && `Email: ${c.email}${c.emailNote ? ` (${c.emailNote})` : ""}.`,
    c.supportNote && `${c.supportLabel || "Note"}: ${c.supportNote}.`,
    l.address && `Address: ${String(l.address).replace(/\s*\n\s*/g, ", ")}.`,
    l.hours && `${l.hoursLabel || "Hours"}: ${l.hours}.`,
    l.happyHour && `${l.happyHourLabel || "Happy hour"}: ${l.happyHour}.`,
    // deno-lint-ignore no-explicit-any
    ...(f.social?.links ?? []).filter((x: any) => x.url).map((x: any) => `${x.label}: ${x.url}`),
    // deno-lint-ignore no-explicit-any
    ...(f.reviews?.links ?? []).filter((x: any) => x.url).map((x: any) => `Reviews on ${x.label}: ${x.url}`),
  ].filter(Boolean);
  for (const sec of site.sections ?? []) {
    if (!sec.visible) continue;
    // deno-lint-ignore no-explicit-any
    if (sec.type === "hours") facts.push(`Opening hours: ${sec.rows.map((r: any) => `${r.day} ${r.hours}`).join("; ")}. ${sec.note ?? ""}`);
    if (sec.type === "location") facts.push(`Location: ${String(sec.address).replace(/\n/g, ", ")}. ${sec.hours ? `Hours: ${sec.hours}.` : ""} ${sec.phone ? `Phone: ${sec.phone}.` : ""}`);
    // deno-lint-ignore no-explicit-any
    if (sec.type === "faq") facts.push(`FAQ: ${sec.items.map((i: any) => `Q: ${i.q} A: ${i.a}`).join(" | ")}`);
  }
  const lines: string[] = [];
  if (a.includeMenu) {
    for (const sec of site.menu?.sections ?? []) {
      lines.push(`## ${[sec.group, sec.title].filter(Boolean).join(" · ")}${sec.subtitle ? ` (${sec.subtitle})` : ""}${sec.note ? ` — ${sec.note}` : ""}`);
      for (const i of sec.items) lines.push(`- ${i.name}${i.vegetarian ? " (vegetarian)" : ""}: ${i.prices ? `glass ₱${i.prices.glass} / bottle ₱${i.prices.bottle}` : `₱${i.price ?? "?"}`}${i.description ? ` — ${i.description}` : ""}`);
    }
  }
  // deno-lint-ignore no-explicit-any
  const kb = (a.knowledge ?? []).map((k: any) => `### ${k.name}\n${k.text}`).join("\n\n");
  return [
    String(a.systemPrompt ?? "").trim(),
    "FACTS:\n" + facts.join("\n"),
    lines.length ? "MENU (prices in Philippine pesos):\n" + lines.join("\n") : "",
    kb ? "KNOWLEDGE BASE:\n" + kb.slice(0, 40_000) : "",
    "PERSONA AND FORMATTING RULES:\nBe funny, witty, charming, and entertaining with clever banter, but ALWAYS completely informative and accurate. DO NOT use emojis. DO NOT use markdown symbols (no asterisks **, no dashes - at line starts, no hash headers ##). Output clean, readable plain text with clean line breaks.",
  ].filter(Boolean).join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "chat");
    if (action === "status") return json({ configured: !!KEY });
    if (!KEY) return json({ code: "AGENT_NOT_CONFIGURED", message: "OPENROUTER_API_KEY is not set: supabase secrets set OPENROUTER_API_KEY=sk-or-…" }, 503);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authed = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: userData } = await authed.auth.getUser();
    let isAdmin = false;
    if (userData?.user) {
      const { data: su } = await authed.from("staff_users").select("role").eq("user_id", userData.user.id).maybeSingle();
      isAdmin = su?.role === "admin";
    }

    if (action === "test") {
      if (!isAdmin) return json({ code: "AUTH", message: "Admin only." }, 403);
      const t0 = Date.now();
      const model = String(body.model || "openrouter/free");
      let keyMsg = "Key accepted.";
      try {
        const r = await fetch(`${OR}/auth/key`, { headers: headers() });
        if (r.status === 401 || r.status === 403) return json({ ok: false, message: "OpenRouter rejected this API key.", latencyMs: Date.now() - t0, model });
        const d = await r.json().catch(() => ({}));
        if (d?.data?.label) keyMsg = `Key valid (${d.data.label}).`;
      } catch { /* continue */ }
      try {
        const reply = await chat(model, [{ role: "user", content: "Reply with the single word OK." }], 0, 8);
        return json({ ok: true, message: `${keyMsg} Model replied “${reply.slice(0, 40)}”.`, latencyMs: Date.now() - t0, model });
      } catch (e) {
        return json({ ok: false, message: (e as Error).message, latencyMs: Date.now() - t0, model });
      }
    }

    // chat
    const ip = req.headers.get("x-forwarded-for") ?? "anon";
    if (!isAdmin) {
      const now = Date.now();
      const b = rate.get(ip) ?? { count: 0, resetAt: now + 10 * 60_000 };
      if (now > b.resetAt) Object.assign(b, { count: 0, resetAt: now + 10 * 60_000 });
      b.count += 1;
      rate.set(ip, b);
      if (b.count > 30) return json({ code: "RATE_LIMIT", message: "Too many messages — please slow down." }, 429);
    }
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: siteRow } = await service.from("site_config").select("config").eq("id", "live").maybeSingle();
    const site = siteRow?.config;
    if (!site) return json({ code: "AGENT_NOT_CONFIGURED", message: "Publish the site once so the assistant has a menu to work from." }, 503);
    const override = isAdmin && body.override && typeof body.override === "object" ? body.override : null;
    if (!site.agent?.enabled && !override) return json({ code: "AGENT_DISABLED", message: "The assistant is switched off." }, 503);
    const messages: Msg[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: Msg) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m: Msg) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (messages.length === 0) return json({ code: "VALIDATION", message: "No message." }, 400);
    const reply = await chat(String(override?.model || site.agent?.model || "openrouter/free"), [{ role: "system", content: buildSystemPrompt(site) }, ...messages], Number(override?.temperature ?? site.agent?.temperature ?? 0.4));
    return json({ reply });
  } catch (e) {
    console.error(e);
    return json({ code: "OPENROUTER", message: (e as Error).message || "The assistant is unavailable right now." }, 502);
  }
});
