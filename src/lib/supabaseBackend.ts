import { createClient } from "@supabase/supabase-js";
import type { CostingData } from "@/data/costing";
import { EMPTY_COSTING } from "@/data/costing";
import type { MediaAsset, MediaKind, SiteConfig } from "@/data/site";
import type { ChatMessage } from "@/lib/openrouter";
import { ApiError, type AgentTestResult, type Backend, type LoginCredentials, type LoginResult, type Order, type OrderStatus, type SecretStatus, type SubmitPayload } from "@/lib/backend";

/**
 * Supabase adapter. Schema + policies live in supabase/migrations, order placement
 * and the AI proxy run as Edge Functions (supabase/functions). See supabase/README.md.
 */
export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

  async function fnError(error: unknown, fallback: string): Promise<ApiError> {
    const e = error as { message?: string; context?: Response } | null;
    let code = "FUNCTION";
    let message = e?.message || fallback;
    let status = 500;
    try {
      const ctx = e?.context;
      if (ctx && typeof ctx.json === "function") {
        status = ctx.status;
        const j = (await ctx.json()) as { code?: string; message?: string };
        code = j.code ?? code;
        message = j.message ?? message;
      }
    } catch {
      /* ignore */
    }
    return new ApiError(code, message, status);
  }

  async function invoke<T>(name: string, body: Record<string, unknown>, fallback: string): Promise<T> {
    const { data, error } = await sb.functions.invoke<T>(name, { body });
    if (error) throw await fnError(error, fallback);
    return data as T;
  }

  async function requireSession() {
    const { data } = await sb.auth.getSession();
    if (!data.session) throw new ApiError("AUTH", "Please sign in again.", 401);
    return data.session;
  }

  const backend: Backend = {
    mode: "live",
    provider: "supabase",
    authKind: "password",
    description: `Supabase project ${new URL(url).hostname}`,

    async getAvailability() {
      const { data, error } = await sb.from("item_availability").select("item_id").eq("available", false);
      if (error) throw new ApiError("DB", error.message);
      return (data ?? []).map((r) => r.item_id as string);
    },
    async submitOrder(payload: SubmitPayload) {
      const d = await invoke<{ order: Order }>("place-order", { ...payload }, "Could not place the order.");
      return d.order;
    },
    async getOrder(id: string) {
      const { data, error } = await sb.rpc("get_order", { p_id: id });
      if (error) throw new ApiError("DB", error.message);
      return (data as Order | null) ?? null;
    },
    async staffLogin(c: LoginCredentials): Promise<LoginResult> {
      if (!c.email || !c.password) throw new ApiError("AUTH", "Enter your staff email and password.", 400);
      const { data, error } = await sb.auth.signInWithPassword({ email: c.email, password: c.password });
      if (error || !data.session) throw new ApiError("AUTH", error?.message ?? "Sign-in failed.", 401);
      const { data: su } = await sb.from("staff_users").select("role").eq("user_id", data.user.id).maybeSingle();
      if (!su) {
        await sb.auth.signOut();
        throw new ApiError("AUTH", "This account isn't on the staff list (insert it into staff_users).", 403);
      }
      return { token: data.session.access_token, role: su.role === "admin" ? "admin" : "staff" };
    },
    async staffOrders() {
      await requireSession();
      const { data, error } = await sb.from("orders").select("data").order("created_at", { ascending: false }).limit(500);
      if (error) throw new ApiError("DB", error.message, error.code === "42501" ? 401 : 500);
      return (data ?? []).map((r) => r.data as Order);
    },
    async staffUpdateStatus(_token: string, id: string, status: OrderStatus) {
      await requireSession();
      const { data, error } = await sb.rpc("update_order_status", { p_id: id, p_status: status });
      if (error) {
        const [code, msg] = error.message.includes(":") ? error.message.split(/:(.+)/) : ["DB", error.message];
        throw new ApiError(code.trim(), (msg ?? error.message).trim(), code.trim() === "CONFLICT" ? 409 : 400);
      }
      return data as Order;
    },
    async staffSetAvailability(_token: string, itemId: string, available: boolean) {
      await requireSession();
      const { error } = await sb.from("item_availability").upsert({ item_id: itemId, available, updated_at: new Date().toISOString() });
      if (error) throw new ApiError("DB", error.message);
      return backend.getAvailability();
    },
    async getSite() {
      const { data, error } = await sb.from("site_config").select("config").eq("id", "live").maybeSingle();
      if (error) throw new ApiError("DB", error.message);
      return (data?.config as SiteConfig | undefined) ?? null;
    },
    async saveSite(_token: string, site: SiteConfig) {
      await requireSession();
      const { error } = await sb.from("site_config").upsert({ id: "live", config: site, updated_at: new Date().toISOString() });
      if (error) throw new ApiError("DB", `${error.message} (is this user an admin in staff_users?)`);
      return site;
    },
    async uploadMedia(_token: string, key: string, file: Blob, meta: { name: string; kind: MediaKind }): Promise<MediaAsset> {
      await requireSession();
      const { processImage } = await import("@/lib/media");
      const blob = meta.kind === "image" && file instanceof File ? await processImage(file) : file;
      const ext = (meta.name.split(".").pop() || (meta.kind === "video" ? "mp4" : "jpg")).toLowerCase();
      const path = `${key}-${Date.now().toString(36)}.${ext}`;
      const { error } = await sb.storage.from("media").upload(path, blob, { upsert: true, contentType: blob.type || undefined });
      if (error) throw new ApiError("STORAGE", error.message);
      const { data } = sb.storage.from("media").getPublicUrl(path);
      return { url: data.publicUrl, kind: meta.kind, name: meta.name };
    },
    async getCosting() {
      await requireSession();
      const { data, error } = await sb.from("menu_costing").select("data").eq("id", "live").maybeSingle();
      if (error) throw new ApiError("DB", `${error.message} (run the costing migration and sign in as staff)`);
      return (data?.data as CostingData | undefined) ?? EMPTY_COSTING;
    },
    async saveCosting(_token: string, costing: CostingData) {
      await requireSession();
      const { error } = await sb.from("menu_costing").upsert({ id: "live", data: costing, updated_at: new Date().toISOString() });
      if (error) throw new ApiError("DB", `${error.message} (is this user an admin in staff_users?)`);
      return costing;
    },
    async getSecretStatus(): Promise<SecretStatus> {
      try {
        const d = await invoke<{ configured: boolean }>("agent-chat", { action: "status" }, "Status check failed.");
        return { configured: !!d.configured, hint: d.configured ? "Set as Edge Function secret" : "", managedExternally: true, instructions: "supabase secrets set OPENROUTER_API_KEY=sk-or-…" };
      } catch (e) {
        return { configured: false, hint: "", managedExternally: true, instructions: `Deploy the agent-chat function, then: supabase secrets set OPENROUTER_API_KEY=sk-or-… (${e instanceof Error ? e.message : "not reachable"})` };
      }
    },
    async setSecret() {
      throw new ApiError("UNSUPPORTED", "With Supabase the key is stored as an Edge Function secret: supabase secrets set OPENROUTER_API_KEY=sk-or-…", 400);
    },
    async agentTest(_token: string, model: string): Promise<AgentTestResult> {
      await requireSession();
      return invoke<AgentTestResult>("agent-chat", { action: "test", model }, "Agent test failed.");
    },
    async agentChat(messages: ChatMessage[], site: SiteConfig, adminToken?: string, extraSystem?: string) {
      const override = extraSystem || adminToken ? { model: site.agent.model, temperature: site.agent.temperature, systemPrompt: extraSystem } : undefined;
      const d = await invoke<{ reply: string }>("agent-chat", { action: "chat", messages, override }, "The assistant is unavailable right now.");
      return d.reply;
    },
    subscribe(cb: () => void) {
      const ch = sb
        .channel("gg-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => cb())
        .on("postgres_changes", { event: "*", schema: "public", table: "item_availability" }, () => cb())
        .on("postgres_changes", { event: "*", schema: "public", table: "site_config" }, () => cb())
        .subscribe();
      return () => {
        void sb.removeChannel(ch);
      };
    },
  };
  return backend;
}
