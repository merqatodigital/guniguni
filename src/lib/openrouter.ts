import type { SiteConfig } from "@/data/site";
import { GUEST_SKILL_BLOCK } from "@/data/agentSkills";

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ORModel {
  id: string;
  name: string;
  free: boolean;
  context: number;
  promptPrice: number;
  completionPrice: number;
}

/** Curated "top paid" picks — only the ones present in the live catalogue are shown. */
export const TOP_PAID_IDS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "openai/gpt-5",
  "openai/o3-mini",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "meta-llama/llama-4-maverick",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-chat-v3-0324",
  "mistralai/mistral-large",
  "x-ai/grok-4",
  "x-ai/grok-3",
  "qwen/qwen3-235b-a22b",
];

const fb = (id: string, free = false): ORModel => ({ id, name: id, free, context: 0, promptPrice: 0, completionPrice: 0 });

/**
 * Reliable free-model chain. OpenRouter volunteer GPUs go down often ("Provider returned error");
 * we send this list as `models` so the request automatically hops to the next healthy one.
 */
export const FREE_FALLBACKS = [
  "openrouter/free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-8b:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "openai/gpt-oss-20b:free",
];

export const FALLBACK_MODELS: ORModel[] = [
  { ...fb("openrouter/free", true), name: "OpenRouter Free router (auto-picks a healthy free model)" },
  ...FREE_FALLBACKS.filter((id) => id !== "openrouter/free").map((id) => fb(id, true)),
  ...TOP_PAID_IDS.map((id) => fb(id)),
];

export async function fetchModels(): Promise<ORModel[]> {
  const res = await fetch(`${OPENROUTER_BASE}/models`);
  if (!res.ok) throw new Error(`Model list failed (${res.status})`);
  const data = (await res.json()) as { data?: Array<{ id: string; name?: string; context_length?: number; pricing?: { prompt?: string; completion?: string } }> };
  const list = (data.data ?? [])
    .filter((m) => m && m.id)
    .map((m) => {
      const p = Number(m.pricing?.prompt ?? 0);
      const c = Number(m.pricing?.completion ?? 0);
      return { id: m.id, name: m.name ?? m.id, free: (p === 0 && c === 0) || /:free$/.test(m.id), context: Number(m.context_length ?? 0), promptPrice: p, completionPrice: c };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!list.some((m) => m.id === "openrouter/free")) list.unshift({ ...fb("openrouter/free", true), name: "OpenRouter Free router (auto-picks a free model)" });
  return list;
}

export function groupModels(models: ORModel[]) {
  const free = models.filter((m) => m.free).sort((a, b) => (a.id === "openrouter/free" ? -1 : b.id === "openrouter/free" ? 1 : a.name.localeCompare(b.name)));
  const paid = models.filter((m) => !m.free);
  const top = TOP_PAID_IDS.map((id) => paid.find((m) => m.id === id)).filter((m): m is ORModel => !!m);
  return { free, paid, top };
}

export function priceLabel(m: ORModel): string {
  if (m.free) return "Free";
  if (!m.promptPrice && !m.completionPrice) return "Paid";
  const per1m = (n: number) => `$${(n * 1_000_000).toFixed(2)}`;
  return `${per1m(m.promptPrice)} in · ${per1m(m.completionPrice)} out / 1M tokens`;
}

function headers(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": typeof location !== "undefined" ? location.origin : "https://guniguni.bistro",
    "X-Title": "GUNI GUNI Bistro",
  };
}

export async function testKey(key: string): Promise<{ ok: boolean; message: string }> {
  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_BASE}/auth/key`, { headers: headers(key) });
  } catch {
    return { ok: false, message: "Could not reach openrouter.ai from this device." };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, message: "OpenRouter rejected this API key." };
  if (!res.ok) return { ok: true, message: `Key check returned ${res.status}; verifying with a live completion.` };
  const d = (await res.json().catch(() => ({}))) as { data?: { label?: string; usage?: number; limit?: number | null } };
  const info = d.data ?? {};
  const usage = typeof info.usage === "number" ? ` · used $${info.usage.toFixed(2)}` : "";
  const limit = info.limit != null ? ` of $${info.limit}` : "";
  return { ok: true, message: `Key valid${info.label ? ` (${info.label})` : ""}${usage}${limit}.` };
}

function unique(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function extractContent(content: unknown): string | null {
  if (typeof content === "string") return content.trim() || null;
  if (Array.isArray(content)) {
    const t = content
      .map((p) => (typeof p === "string" ? p : p && typeof p === "object" && "text" in p ? String((p as { text: unknown }).text ?? "") : ""))
      .join("")
      .trim();
    return t || null;
  }
  return null;
}

function orMessage(data: { error?: { message?: string; metadata?: { provider_name?: string } }; message?: string }, status: number): string {
  const raw = data?.error?.message || data?.message || `OpenRouter error ${status}`;
  const provider = data?.error?.metadata?.provider_name;
  if (/provider returned error/i.test(raw)) {
    return provider ? `${provider} is down for this model.` : "That model's free provider is down right now.";
  }
  return raw;
}

export async function chatCompletion(
  key: string,
  opts: { model: string; messages: ChatMessage[]; temperature?: number; maxTokens?: number; fallbacks?: string[] },
): Promise<string> {
  const useFreeChain = opts.model.endsWith(":free") || opts.model === "openrouter/free" || opts.model.includes("/free");
  const chain = unique([opts.model, ...(opts.fallbacks ?? (useFreeChain ? FREE_FALLBACKS : []))]);
  let lastErr = "OpenRouter request failed.";
  for (let i = 0; i < chain.length; i++) {
    const primary = chain[i];
    const rest = chain.slice(i + 1, i + 4);
    try {
      const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers: headers(key),
        body: JSON.stringify({
          model: primary,
          models: rest.length ? rest : undefined,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 700,
          provider: { allow_fallbacks: true },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; metadata?: { provider_name?: string } };
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      if (!res.ok) {
        lastErr = orMessage(data, res.status);
        if (res.status === 401 || res.status === 403) throw new Error("OpenRouter rejected this API key.");
        if (res.status === 402) throw new Error("This model needs OpenRouter credits. Pick a :free model or add credit at openrouter.ai/credits.");
        continue;
      }
      const text = extractContent(data?.choices?.[0]?.message?.content);
      if (!text) {
        lastErr = "The model returned an empty reply.";
        continue;
      }
      return text;
    } catch (e) {
      if (e instanceof Error && /rejected this API key|needs OpenRouter credits/i.test(e.message)) throw e;
      lastErr = e instanceof Error ? e.message : lastErr;
    }
  }
  throw new Error(lastErr);
}

export async function runAgentTest(key: string, model: string) {
  const t0 = performance.now();
  const k = await testKey(key);
  if (!k.ok) return { ok: false, message: k.message, latencyMs: 0, model };
  const chain = unique([model, ...FREE_FALLBACKS]);
  let lastErr = "";
  for (const id of chain) {
    try {
      const reply = await chatCompletion(key, {
        model: id,
        fallbacks: [],
        messages: [{ role: "user", content: "Reply with the single word OK." }],
        maxTokens: 32,
        temperature: 0,
      });
      const hopped = id !== model;
      return {
        ok: true,
        message: hopped
          ? `${k.message} “${model}” is down. Connected via ${id} — replied “${reply.slice(0, 40)}”.`
          : `${k.message} Model replied “${reply.slice(0, 40)}”.`,
        latencyMs: Math.round(performance.now() - t0),
        model: id,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Model test failed.";
      if (/rejected this API key|needs OpenRouter credits/i.test(lastErr)) {
        return { ok: false, message: lastErr, latencyMs: Math.round(performance.now() - t0), model };
      }
    }
  }
  return { ok: false, message: lastErr || "No free model is reachable right now. Wait a minute and test again, or pick a paid model.", latencyMs: Math.round(performance.now() - t0), model };
}

/* ------------------------------ Prompt building ------------------------------ */
export function menuKnowledge(site: SiteConfig): string {
  const lines: string[] = [];
  for (const s of site.menu.sections) {
    const head = [s.group, s.title].filter(Boolean).join(" · ");
    lines.push(`## ${head}${s.subtitle ? ` (${s.subtitle})` : ""}${s.note ? ` — ${s.note}` : ""}`);
    for (const i of s.items) {
      const price = i.prices ? `glass ₱${i.prices.glass} / bottle ₱${i.prices.bottle}` : `₱${i.price ?? "?"}`;
      lines.push(`- ${i.name}${i.vegetarian ? " (vegetarian)" : ""}: ${price}${i.description ? ` — ${i.description}` : ""}`);
    }
  }
  return lines.join("\n");
}

export function buildSystemPrompt(site: SiteConfig): string {
  const parts: string[] = [site.agent.systemPrompt.trim()];
  const f = site.footer;
  const facts: string[] = [
    `Restaurant name: ${site.header.brand} ${site.header.brandSub}.`,
    f.serviceNote,
    f.contact.phone && `Phone: ${f.contact.phone}.`,
    f.contact.email && `Email: ${f.contact.email}${f.contact.emailNote ? ` (${f.contact.emailNote})` : ""}.`,
    f.contact.supportNote && `${f.contact.supportLabel || "Note"}: ${f.contact.supportNote}.`,
    f.location.address && `Address: ${f.location.address.replace(/\s*\n\s*/g, ", ")}.`,
    f.location.hours && `${f.location.hoursLabel || "Hours"}: ${f.location.hours}.`,
    f.location.happyHour && `${f.location.happyHourLabel || "Happy hour"}: ${f.location.happyHour}.`,
    ...f.social.links.filter((l) => l.url).map((l) => `${l.label}: ${l.url}`),
    ...f.reviews.links.filter((l) => l.url).map((l) => `Reviews on ${l.label}: ${l.url}`),
  ].filter((x): x is string => !!x);
  for (const sec of site.sections) {
    if (!sec.visible) continue;
    if (sec.type === "hours") facts.push(`Opening hours: ${sec.rows.map((r) => `${r.day} ${r.hours}`).join("; ")}. ${sec.note}`);
    if (sec.type === "location") facts.push(`Location: ${sec.address.replace(/\n/g, ", ")}. ${sec.hours ? `Hours: ${sec.hours}.` : ""} ${sec.phone ? `Phone: ${sec.phone}.` : ""}`);
    if (sec.type === "faq") facts.push(`FAQ: ${sec.items.map((i) => `Q: ${i.q} A: ${i.a}`).join(" | ")}`);
  }
  parts.push("FACTS:\n" + facts.join("\n"));
  if (site.agent.includeMenu) parts.push("MENU (prices in Philippine pesos):\n" + menuKnowledge(site));
  const kb = site.agent.knowledge.map((k) => `### ${k.name}\n${k.text}`).join("\n\n");
  if (kb) parts.push("KNOWLEDGE BASE:\n" + kb.slice(0, 40_000));
  parts.push(GUEST_SKILL_BLOCK);
  parts.push(
    "IMPORTANT FINAL INSTRUCTION:\nDo NOT use any markdown symbols (no asterisks **, no dashes - at line starts, no hash headers ##). Do NOT use any emojis. Be funny, charismatic, and entertaining, but always completely informative and accurate with dishes, prices, hours, and ordering.",
  );
  return parts.join("\n\n");
}
