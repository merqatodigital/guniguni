import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { useSite } from "@/context/SiteContext";
import { ApiError, DEMO_SECRET_KEY } from "@/lib/backend";
import { skillOn } from "@/data/agentSkills";
import type { ChatMessage } from "@/lib/openrouter";
import { cleanAgentText } from "@/lib/cleanText";
import { Icon, Modal } from "@/components/ui";

export function AgentWidget() {
  const { config } = useSite();
  const { backend, mode, itemCount } = useApp();
  const location = useLocation();
  const agent = config.agent;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  if (!agent.enabled || location.pathname.startsWith("/admin") || location.pathname.startsWith("/staff")) return null;
  if (!skillOn(agent.skills, "guest-host") && !skillOn(agent.skills, "guest-order")) return null;
  if (mode === "demo" && !localStorage.getItem(DEMO_SECRET_KEY)) return null; // demo: key lives on the admin's device only

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !backend) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const reply = await backend.agentChat(next, config);
      setMessages([...next, { role: "assistant", content: cleanAgentText(reply) }]);
    } catch (e) {
      const raw = e instanceof ApiError || e instanceof Error ? e.message : "The assistant is unavailable right now.";
      setError(/provider returned error/i.test(raw) ? "That model is busy. Try again in a moment — we’ll switch to another free model." : raw);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Chat with ${agent.name}`}
        className={cn(
          "fixed left-4 z-[58] flex h-12 items-center gap-2 rounded-full bg-cream pl-3 pr-4 text-ink shadow-[0_10px_28px_rgba(0,0,0,0.22)] ring-1 ring-ink/15 transition hover:bg-yellow md:left-6 md:bottom-6",
          itemCount > 0 ? "bottom-[calc(var(--sab)+84px)]" : "bottom-[calc(var(--sab)+16px)]",
        )}
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-ink text-yellow">
          <Icon.Sparkles size={15} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-leaf ring-2 ring-cream" aria-hidden />
        </span>
        <span className="cond text-[13px] font-medium uppercase tracking-[0.12em]">Ask us</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} variant="drawer" labelledBy="agent-title">
        <header className="flex flex-none items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="kicker text-muted">Virtual host</p>
            <h2 id="agent-title" className="display mt-1 text-[28px]">
              {agent.name}
            </h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-ink/20" aria-label="Close chat">
            <Icon.X size={18} />
          </button>
        </header>
        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
          <Bubble role="assistant">{agent.greeting}</Bubble>
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role}>
              {m.content}
            </Bubble>
          ))}
          {busy && (
            <Bubble role="assistant">
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
            void send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Ask about dishes, prices, hours…"
            className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-ink/20 bg-white/60 px-4 py-3 text-[15px] outline-none focus:border-ink"
            data-autofocus
            aria-label="Your message"
          />
          <button type="submit" disabled={!input.trim() || busy} className="grid h-[46px] w-[46px] flex-none place-items-center rounded-full bg-ink text-cream disabled:opacity-40" aria-label="Send">
            <Icon.Send size={18} />
          </button>
        </form>
        <p className="flex-none px-5 pb-2 text-[10px] text-muted">Answers come from the published menu and knowledge files. Prices are confirmed at the counter.</p>
      </Modal>
    </>
  );
}

function Bubble({ role, children }: { role: ChatMessage["role"]; children: React.ReactNode }) {
  const me = role === "user";
  const content = typeof children === "string" && !me ? cleanAgentText(children) : children;
  return (
    <div className={cn("flex", me ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-[14.5px] leading-[1.6]",
          me ? "rounded-br-sm bg-ink text-cream" : "rounded-bl-sm bg-yellow/40 text-ink shadow-sm",
        )}
      >
        {content}
      </div>
    </div>
  );
}
