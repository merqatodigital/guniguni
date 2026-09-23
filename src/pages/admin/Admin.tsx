import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { useSite } from "@/context/SiteContext";
import { Icon, Logo } from "@/components/ui";
import { AdminCtx, Btn } from "./fields";
import { HeaderFooterPanel, HomePanel, MediaPanel, MenuPanel, OverviewPanel, PublishPanel, ThemePanel } from "./panels";
import { AgentPanel, PagesPanel, SectionsPanel } from "./sectionsPanel";
import { CostingPanel } from "./costingPanel";
import { AgentOps } from "@/components/AgentOps";

const TOKEN_KEY = "gg.staff.token";
const ROLE_KEY = "gg.staff.role";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "theme", label: "Theme & fonts" },
  { id: "chrome", label: "Header & footer" },
  { id: "home", label: "Home page" },
  { id: "sections", label: "Sections" },
  { id: "pages", label: "Pages" },
  { id: "menu", label: "Menu" },
  { id: "costing", label: "Costs & recipes" },
  { id: "media", label: "Media" },
  { id: "agent", label: "AI agent" },
  { id: "publish", label: "Publish" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function Admin() {
  const { backend, mode, toast } = useApp();
  const site = useSite();
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [role, setRole] = useState(() => sessionStorage.getItem(ROLE_KEY) ?? "");
  const [tab, setTab] = useState<Tab>("overview");
  const [publishing, setPublishing] = useState(false);

  const signOut = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    setToken("");
    setRole("");
  };

  const publish = async () => {
    setPublishing(true);
    try {
      await site.publish(token);
      toast(mode === "demo" ? "Published to this browser's demo storage." : "Published — live for every visitor.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed.";
      toast(msg);
      if (/sign in/i.test(msg)) signOut();
    } finally {
      setPublishing(false);
    }
  };

  if (!token || role !== "admin") {
    return (
      <AdminLogin
        onDone={(t, r) => {
          sessionStorage.setItem(TOKEN_KEY, t);
          sessionStorage.setItem(ROLE_KEY, r);
          setToken(t);
          setRole(r);
        }}
        staffOnly={!!token && role !== "admin"}
      />
    );
  }

  const go = (t: string) => {
    setTab(t as Tab);
    window.scrollTo({ top: 0 });
  };

  return (
    <AdminCtx.Provider value={{ token }}>
      <div className="min-h-dvh bg-cream-2/70">
        <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3 px-4 py-2.5">
            <Logo size={40} />
            <div className="mr-2">
              <p className="cond text-[14px] font-medium tracking-[0.2em]">{site.config.header.brand}</p>
              <p className="kicker text-muted">Backoffice</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", site.isDirty ? "bg-yellow" : "bg-ink/10")}>{site.isDirty ? "Unpublished changes" : site.hasDraft ? "Draft in sync" : "Live"}</span>
            {mode === "demo" && <span className="rounded-full border border-yellow px-2.5 py-1 text-[11px]">Demo storage</span>}
            <div className="ml-auto flex items-center gap-2">
              <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-3 py-1.5 text-[12.5px] hover:border-ink">
                <Icon.Eye size={14} /> View site
              </Link>
              <Btn variant="primary" small onClick={publish} disabled={publishing || !backend}>
                {publishing ? "Publishing…" : "Publish"}
              </Btn>
              <Btn small onClick={signOut}>
                Sign out
              </Btn>
            </div>
          </div>
          <nav className="no-scrollbar mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Admin sections">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => go(t.id)} className={cn("flex-none rounded-full px-3 py-1.5 text-[12.5px]", tab === t.id ? "bg-ink text-cream" : "bg-ink/5")}>
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="mx-auto flex max-w-[1280px] gap-6 px-4 py-6">
          <nav className="hidden w-52 flex-none lg:block" aria-label="Admin sections">
            <ul className="sticky top-24 space-y-1">
              {TABS.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => go(t.id)} className={cn("w-full rounded-lg px-3 py-2 text-left text-[13.5px] transition", tab === t.id ? "bg-ink text-cream" : "hover:bg-ink/5")}>
                    {t.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <main className="min-w-0 flex-1">
            {tab === "overview" && <OverviewPanel go={go} />}
            {tab === "theme" && <ThemePanel />}
            {tab === "chrome" && <HeaderFooterPanel />}
            {tab === "home" && <HomePanel />}
            {tab === "sections" && <SectionsPanel />}
            {tab === "pages" && <PagesPanel />}
            {tab === "menu" && <MenuPanel go={go} />}
            {tab === "costing" && <CostingPanel />}
            {tab === "media" && <MediaPanel />}
            {tab === "agent" && <AgentPanel />}
            {tab === "publish" && <PublishPanel onPublish={publish} publishing={publishing} />}
          </main>
        </div>
        <AgentOps token={token} audience="admin" />
      </div>
    </AdminCtx.Provider>
  );
}

function AdminLogin({ onDone, staffOnly }: { onDone: (token: string, role: string) => void; staffOnly: boolean }) {
  const { backend, mode } = useApp();
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(staffOnly ? "Your current sign-in is staff-only. Use the admin PIN / account." : null);
  const [busy, setBusy] = useState(false);
  const password_ = backend?.authKind === "password";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!backend) return;
    setBusy(true);
    setError(null);
    try {
      const r = await backend.staffLogin(password_ ? { email: email.trim(), password } : { pin: pin.trim() });
      if (r.role !== "admin") throw new Error("This account is staff-only. Admin access needs the ADMIN_PIN (server) or role = 'admin' in staff_users (Supabase).");
      onDone(r.token, r.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-5 py-10">
      <div className="flex items-center gap-3">
        <Logo size={56} />
        <div>
          <p className="cond text-[15px] font-medium tracking-[0.2em]">GUNI GUNI BISTRO</p>
          <p className="kicker text-muted">Admin sign-in</p>
        </div>
      </div>
      <h1 className="display mt-8 text-[46px]">Backoffice.</h1>
      <form onSubmit={submit} className="mt-5 space-y-3">
        {password_ ? (
          <>
            <label className="block">
              <span className="kicker text-muted">Admin email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" className="mt-2 w-full rounded-xl border border-ink/25 bg-white/60 px-4 py-3 text-[16px] outline-none focus:border-ink" autoFocus />
            </label>
            <label className="block">
              <span className="kicker text-muted">Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-ink/25 bg-white/60 px-4 py-3 text-[16px] outline-none focus:border-ink" />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="kicker text-muted">Admin passkey</span>
            <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" inputMode="numeric" autoComplete="one-time-code" className="cond mt-2 w-full rounded-xl border border-ink/25 bg-white/60 px-4 py-3 text-[24px] tracking-[0.4em] outline-none focus:border-ink" autoFocus />
          </label>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !backend || (password_ ? !email || !password : !pin)} className="cond w-full rounded-full bg-ink py-3.5 text-[16px] font-medium uppercase tracking-[0.12em] text-cream disabled:opacity-40">
          {busy ? "Signing in…" : mode === "checking" ? "Connecting…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-[12px] text-muted">
        {mode === "demo" ? "Demo mode — enter the admin passkey. Everything you publish stays in this browser until a server or Supabase is connected." : password_ ? "Sign in with a Supabase Auth user listed in staff_users with role 'admin'." : "Enter the admin passkey (ADMIN_PIN on the server)."}
      </p>
      <Link to="/" className="kicker mt-8 inline-flex items-center gap-2 text-muted">
        <Icon.ArrowLeft size={12} /> Back to the website
      </Link>
    </div>
  );
}
