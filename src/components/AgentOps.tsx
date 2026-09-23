import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { useSite } from "@/context/SiteContext";
import { ApiError, DEMO_SECRET_KEY, type Order } from "@/lib/backend";
import type { ChatMessage } from "@/lib/openrouter";
import { MOCK_COSTING, isEmptyCosting } from "@/data/mockCosting";
import { EMPTY_COSTING, type CostingData } from "@/data/costing";
import { DEFAULT_TASKS, buildOpsPrompt, cannedPrompt, mergeSkills, type AgentTask } from "@/data/agentSkills";
import { cleanAgentText } from "@/lib/cleanText";
import { Icon, Modal } from "@/components/ui";

export function AgentOps({ token, audience }: { token: string; audience: "admin" | "staff" }) {
  const { config } = useSite();
  const { backend, unavailable } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costing, setCosting] = useState<CostingData>(MOCK_COSTING);
  const [orders, setOrders] = useState<Order[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const skills = mergeSkills(config.agent.skills);
  const tasks = (config.agent.tasks?.length ? config.agent.tasks : DEFAULT_TASKS).filter((t) => t.enabled);
  const staffSkills = skills.filter((s) => s.audience === "staff" && s.enabled);

  useEffect(() => {
    if (!backend || !token) return;
    backend.getCosting(token).then((d) => setCosting(isEmptyCosting(d) ? MOCK_COSTING : d ?? EMPTY_COSTING)).catch(() => setCosting(MOCK_COSTING));
    backend.staffOrders(token).then(setOrders).catch(() => setOrders([]));
  }, [backend, token, open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const system = useMemo(
    () => buildOpsPrompt(config, { costing, orders, unavailable: Array.from(unavailable), skills, tasks }),
    [config, costing, orders, unavailable, skills, tasks],
  );

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !backend) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const reply = await backend.agentChat(next, config, token, system);
      setMessages([...next, { role: "assistant", content: cleanAgentText(reply) }]);
    } catch (e) {
      const raw = e instanceof ApiError || e instanceof Error ? e.message : "The copilot is unavailable.";
      setError(/provider returned error/i.test(raw) ? "That model is busy — try again in a moment." : raw);
    } finally {
      setBusy(false);
    }
  };

  const runTask = (t: AgentTask) => void send(cannedPrompt(t));

  const hour = new Date().getHours();
  const suggested = hour < 14 ? "morning" : "afternoon";

  if (typeof localStorage !== "undefined" && !localStorage.getItem(DEMO_SECRET_KEY) && backend?.provider === "demo") return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(var(--sab)+16px)] right-4 z-[58] flex h-12 items-center gap-2 rounded-full bg-ink pl-3 pr-4 text-cream shadow-[0_10px_28px_rgba(0,0,0,0.28)] md:bottom-6 md:right-6"
        aria-label="Open operations copilot"
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-yellow text-ink">
          <Icon.Sparkles size={15} />
        </span>
        <span className="cond text-[13px] font-medium uppercase tracking-[0.12em]">Copilot</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} variant="drawer" labelledBy="ops-agent-title">
        <header className="flex flex-none items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="kicker text-muted">{audience === "admin" ? "Admin" : "Staff"} · operations</p>
            <h2 id="ops-agent-title" className="display mt-1 text-[28px]">
              Copilot.
            </h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-ink/20" aria-label="Close">
            <Icon.X size={18} />
          </button>
        </header>

        <div className="flex-none space-y-2 border-b border-line px-4 py-3">
          <p className="kicker text-muted">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {staffSkills.map((s) => (
              <span key={s.id} className="rounded-full bg-yellow/50 px-2.5 py-1 text-[11px] font-medium">
                {s.label}
              </span>
            ))}
            {staffSkills.length === 0 && <span className="text-[12px] text-muted">No staff skills enabled — turn them on in AI agent.</span>}
          </div>
          <p className="kicker mt-2 text-muted">Tasks</p>
          <div className="flex flex-wrap gap-1.5">
            {tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                onClick={() => runTask(t)}
                className={cn("rounded-full border px-3 py-1.5 text-[12px] hover:bg-yellow/40 disabled:opacity-40", t.when === suggested ? "border-ink bg-yellow/50" : "border-ink/20")}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          <Bubble>
            I can run morning and afternoon briefs, pull this week / month / YTD numbers, check mock inventory and talk through open table orders. Tap a task or ask in your own words.
          </Bubble>
          {messages.map((m, i) => (
            <Bubble key={i} me={m.role === "user"}>
              {m.content}
            </Bubble>
          ))}
          {busy && (
            <Bubble>
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink/50" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink/50 [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-ink/50 [animation-delay:240ms]" />
              </span>
            </Bubble>
          )}
          {error && (
            <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {error}
            </p>
          )}
        </div>

        <form
          className="flex flex-none items-end gap-2 border-t border-line px-4 pb-[calc(var(--sab)+12px)] pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Ask about sales, stock, 86s, briefs…"
            className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-ink/20 bg-white/60 px-4 py-3 text-[15px] outline-none focus:border-ink"
            data-autofocus
            aria-label="Message the copilot"
          />
          <button type="submit" disabled={!input.trim() || busy} className="grid h-[46px] w-[46px] flex-none place-items-center rounded-full bg-ink text-cream disabled:opacity-40" aria-label="Send">
            <Icon.Send size={18} />
          </button>
        </form>
      </Modal>
    </>
  );
}

function Bubble({ me, children }: { me?: boolean; children: React.ReactNode }) {
  const content = typeof children === "string" && !me ? cleanAgentText(children) : children;
  return (
    <div className={cn("flex", me ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-[14px] leading-[1.6]",
          me ? "rounded-br-sm bg-ink text-cream" : "rounded-bl-sm bg-yellow/40 text-ink shadow-sm",
        )}
      >
        {content}
      </div>
    </div>
  );
}
