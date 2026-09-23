import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { useSite } from "@/context/SiteContext";
import { COLOR_META, FONT_CATALOG, FONT_ROLE_META, MEDIA_SLOTS, PLATFORMS, THEME_PRESETS, fontStack, mapsSearchUrl, platformLabel, type FontRole, type NavLink, type SiteConfig, type SocialLink, type SocialPlatform } from "@/data/site";
import { PlatformIcon } from "@/components/brandIcons";
import { slugify, type MenuData, type MenuItem, type MenuPage, type MenuSection } from "@/data/menu";
import { SUPABASE_ENV, SUPABASE_HOST, type SecretStatus } from "@/lib/backend";
import { costedLines, pct, summarize as summarizeCosting, type CostingData } from "@/data/costing";
import { downloadText, formatBytes } from "@/lib/media";
import { uid } from "@/lib/format";
import { Icon } from "@/components/ui";
import { Btn, ColorField, Field, Grid, ListEditor, MediaPicker, NumberInput, Panel, Select, StatusDot, TextArea, TextInput, Toggle, mediaKeyOptions, useAdminToken } from "./fields";

/* --------------------------------- Overview --------------------------------- */
export function OverviewPanel({ go }: { go: (tab: string) => void }) {
  const { backend, mode } = useApp();
  const { config, hasDraft, isDirty, siteLoaded } = useSite();
  const token = useAdminToken();
  const [secret, setSecret] = useState<SecretStatus | null>(null);
  const [costing, setCosting] = useState<CostingData | null>(null);
  useEffect(() => {
    backend?.getSecretStatus(token).then(setSecret).catch(() => setSecret({ configured: false, hint: "" }));
    backend?.getCosting(token).then(setCosting).catch(() => setCosting(null));
  }, [backend, token]);
  const costStats = costing ? summarizeCosting(costedLines(costing)) : null;
  const costingLabel = costStats ? `${costStats.costed}/${costStats.total}` : "—";
  const agentLive = config.agent.enabled && !!secret?.configured && !!config.agent.lastTest?.ok;
  const items = config.menu.sections.reduce((n, s) => n + s.items.length, 0);
  const cards: { title: string; value: string; state: "ok" | "warn" | "bad" | "idle"; tab: string; note: string }[] = [
    { title: "Storage", value: backend?.provider === "demo" ? "Demo (this browser)" : backend?.provider === "supabase" ? "Supabase" : "Restaurant server", state: mode === "live" ? "ok" : "warn", tab: "publish", note: backend?.description ?? "connecting…" },
    { title: "Supabase", value: SUPABASE_ENV.url ? "Configured" : "Not configured", state: SUPABASE_ENV.url ? "ok" : "idle", tab: "publish", note: SUPABASE_ENV.url ? SUPABASE_HOST : "Set VITE_SUPABASE_URL + ANON key" },
    { title: "AI agent", value: agentLive ? "Live" : config.agent.enabled ? "Enabled · not verified" : "Off", state: agentLive ? "ok" : config.agent.enabled ? "warn" : "idle", tab: "agent", note: secret?.configured ? `Key ${secret.hint}` : "No OpenRouter key" },
    { title: "Draft", value: hasDraft ? (isDirty ? "Unpublished changes" : "Draft = published") : "No draft", state: isDirty ? "warn" : "ok", tab: "publish", note: siteLoaded ? `Published ${new Date(config.updatedAt).toLocaleString()}` : "Loading published config…" },
    {
      title: "Food & beverage cost",
      value: costStats?.avgCostPct != null ? pct(costStats.avgCostPct, 1) : "Not set",
      state: costStats?.avgCostPct == null ? "idle" : costStats.avgCostPct <= 0.35 ? "ok" : costStats.avgCostPct <= 0.45 ? "warn" : "bad",
      tab: "costing",
      note: costStats ? `${costStats.costed}/${costStats.total} products costed${costStats.thin.length ? ` · ${costStats.thin.length} thin` : ""}` : "private costing sheet",
    },
  ];
  return (
    <>
      <Panel title="Overview" blurb="Everything on the public site is editable here. Changes save to a local draft instantly; Publish pushes them to storage for every visitor.">
        <Grid cols={4}>
          {cards.map((c) => (
            <button key={c.title} type="button" onClick={() => go(c.tab)} className="rounded-xl border border-line bg-white/50 p-4 text-left transition hover:border-ink">
              <p className="kicker text-muted">{c.title}</p>
              <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
                <StatusDot state={c.state} label="" pulse={c.state === "ok" && c.title === "AI agent"} />
                {c.value}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted">{c.note}</p>
            </button>
          ))}
        </Grid>
        <div className="mt-5 grid gap-3 text-[13px] sm:grid-cols-4">
          <Stat label="Menu items" value={String(items)} onClick={() => go("menu")} />
          <Stat label="Costed products" value={costingLabel} onClick={() => go("costing")} />
          <Stat label="Custom sections" value={String(config.sections.length)} onClick={() => go("sections")} />
          <Stat label="Pages" value={String(config.pages.length)} onClick={() => go("pages")} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-yellow px-4 py-2 text-[13px] font-medium">
            <Icon.Eye size={14} /> View site
          </Link>
          <Link to="/staff" className="inline-flex items-center gap-2 rounded-full border border-ink/25 px-4 py-2 text-[13px]">
            Staff orders <Icon.ArrowRight size={13} />
          </Link>
        </div>
      </Panel>
    </>
  );
}
function Stat({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center justify-between rounded-xl border border-line bg-white/40 px-4 py-3 text-left hover:border-ink">
      <span className="text-muted">{label}</span>
      <span className="cond text-[20px]">{value}</span>
    </button>
  );
}

/* ---------------------------------- Theme ----------------------------------- */
export function ThemePanel() {
  const { config, updateDraft } = useSite();
  const t = config.theme;
  const setTheme = (patch: Partial<typeof t>) => updateDraft((c) => ({ ...c, theme: { ...c.theme, ...patch } }));
  return (
    <>
      <Panel title="Color palette" blurb="Applied live to every page — the mustard bands, headings, hairlines and buttons all follow these tokens.">
        <div className="mb-4 flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button key={p.name} type="button" onClick={() => setTheme({ colors: { ...p.colors } })} className="flex items-center gap-2 rounded-full border border-line bg-white/50 py-1 pl-1 pr-3 text-[12px] hover:border-ink">
              <span className="flex overflow-hidden rounded-full ring-1 ring-ink/10">
                {[p.colors.cream, p.colors.yellow, p.colors.ink].map((c) => (
                  <span key={c} className="h-5 w-5" style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <Grid cols={2}>
          {COLOR_META.map((m) => (
            <ColorField key={m.key} label={m.label} hint={m.hint} value={t.colors[m.key]} onChange={(v) => setTheme({ colors: { ...t.colors, [m.key]: v } })} />
          ))}
        </Grid>
      </Panel>
      <Panel title="Global fonts" blurb="Four font roles drive the whole site. Pick from Google Fonts or type any family name (add its stylesheet URL below).">
        <div className="space-y-4">
          {FONT_ROLE_META.map((r) => {
            const inCatalog = FONT_CATALOG.some((f) => f.family === t.fonts[r.role]);
            return (
              <div key={r.role} className="grid gap-3 rounded-xl border border-line bg-white/40 p-3 sm:grid-cols-[220px_1fr]">
                <div>
                  <Field label={`${r.label} font`} hint={r.hint}>
                    <Select
                      value={inCatalog ? t.fonts[r.role] : "__custom"}
                      onChange={(v) => setTheme({ fonts: { ...t.fonts, [r.role]: v === "__custom" ? "" : v } })}
                      options={[...FONT_CATALOG.filter((f) => f.roles.includes(r.role)).map((f) => ({ value: f.family, label: f.family })), ...FONT_CATALOG.filter((f) => !f.roles.includes(r.role)).map((f) => ({ value: f.family, label: `${f.family} (other)` })), { value: "__custom", label: "Custom family…" }]}
                    />
                  </Field>
                  {!inCatalog && <TextInput value={t.fonts[r.role]} onChange={(v) => setTheme({ fonts: { ...t.fonts, [r.role]: v } })} placeholder="Exact family name, e.g. Druk Wide" />}
                </div>
                <div className="min-w-0 overflow-hidden rounded-lg bg-cream px-3 py-2">
                  <p className="kicker text-muted">Preview</p>
                  <p className={cn("mt-1 truncate", r.role === "display" ? "text-[44px] uppercase leading-none" : r.role === "hand" ? "text-[26px]" : r.role === "cond" ? "text-[22px] uppercase" : "text-[16px]")} style={{ fontFamily: fontStack(r.role as FontRole, t.fonts[r.role] || "serif") }}>
                    {r.sample}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Field label="Custom font stylesheet URL (optional)" hint="A CSS file with @font-face rules for fonts not on Google Fonts (e.g. from Adobe Fonts or your own host).">
            <TextInput value={t.customFontCssUrl} onChange={(v) => setTheme({ customFontCssUrl: v })} placeholder="https://…/fonts.css" mono />
          </Field>
        </div>
      </Panel>
    </>
  );
}

/* ----------------------------- Header & footer ------------------------------ */
function NavEditor({ items, onChange }: { items: NavLink[]; onChange: (n: NavLink[]) => void }) {
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      create={() => ({ id: uid("nav_"), label: "New link", href: "/" })}
      addLabel="Add link"
      render={(l, update) => (
        <Grid cols={2}>
          <Field label="Label">
            <TextInput value={l.label} onChange={(v) => update({ label: v })} />
          </Field>
          <Field label="Link" hint="/menu/pasta · /#place · /about · https://… · tel:+63…">
            <TextInput value={l.href} onChange={(v) => update({ href: v })} mono />
          </Field>
        </Grid>
      )}
    />
  );
}

function SocialLinksEditor({ items, onChange, kind }: { items: SocialLink[]; onChange: (links: SocialLink[]) => void; kind: "social" | "review" }) {
  const options = PLATFORMS.filter((p) => p.kind === kind || p.kind === "any");
  const placeholderFor = (p: SocialPlatform) => PLATFORMS.find((x) => x.id === p)?.placeholder ?? "https://…";
  return (
    <ListEditor
      items={items}
      onChange={onChange}
      create={() => {
        const first = options[0];
        return { id: uid(kind === "social" ? "so_" : "rv_"), platform: first.id, label: first.label, url: "" };
      }}
      summary={(l) => `${l.label || platformLabel(l.platform)}${l.url ? ` — ${l.url}` : " — no URL yet"}`}
      addLabel={kind === "social" ? "Add network" : "Add platform"}
      emptyText={kind === "social" ? "No networks yet." : "No review platforms yet."}
      render={(l, update) => (
        <Grid cols={3}>
          <Field label="Platform">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-full border border-ink/25 bg-white/60">
                <PlatformIcon platform={l.platform} size={16} />
              </span>
              <Select
                value={l.platform}
                onChange={(v) => {
                  const next = v as SocialPlatform;
                  const wasDefaultLabel = !l.label || l.label === platformLabel(l.platform);
                  update({ platform: next, label: wasDefaultLabel ? platformLabel(next) : l.label });
                }}
                options={options.map((p) => ({ value: p.id, label: p.label }))}
              />
            </div>
          </Field>
          <Field label="Label">
            <TextInput value={l.label} onChange={(v) => update({ label: v })} />
          </Field>
          <Field label="URL" hint={l.url ? undefined : `Paste the link, e.g. ${placeholderFor(l.platform)}`}>
            <TextInput value={l.url} onChange={(v) => update({ url: v.trim() })} placeholder={placeholderFor(l.platform)} mono />
          </Field>
        </Grid>
      )}
    />
  );
}

export function HeaderFooterPanel() {
  const { config, updateDraft } = useSite();
  const { header, footer, seo } = config;
  const setH = (p: Partial<typeof header>) => updateDraft((c) => ({ ...c, header: { ...c.header, ...p } }));
  const setF = (p: Partial<typeof footer>) => updateDraft((c) => ({ ...c, footer: { ...c.footer, ...p } }));
  const setC = (p: Partial<typeof footer.contact>) => updateDraft((c) => ({ ...c, footer: { ...c.footer, contact: { ...c.footer.contact, ...p } } }));
  const setL = (p: Partial<typeof footer.location>) => updateDraft((c) => ({ ...c, footer: { ...c.footer, location: { ...c.footer.location, ...p } } }));
  return (
    <>
      <Panel title="Header" blurb="Brand, navigation and the call-to-action shown on the home page and custom pages. Menu pages keep their reference layouts but use the same brand text.">
        <Grid cols={3}>
          <Field label="Brand">
            <TextInput value={header.brand} onChange={(v) => setH({ brand: v })} />
          </Field>
          <Field label="Brand suffix">
            <TextInput value={header.brandSub} onChange={(v) => setH({ brandSub: v })} />
          </Field>
          <Field label="Tagline (menu pages)">
            <TextInput value={header.tagline} onChange={(v) => setH({ tagline: v })} />
          </Field>
        </Grid>
        <div className="mt-4">
          <Toggle checked={header.showLogo} onChange={(v) => setH({ showLogo: v })} label="Show round logo" hint="Upload the original logo under Media → logo" />
        </div>
        <p className="kicker mt-5 mb-2 text-muted">Navigation links</p>
        <NavEditor items={header.nav} onChange={(nav) => setH({ nav })} />
        <p className="kicker mt-5 mb-2 text-muted">Call-to-action button</p>
        <Grid cols={3}>
          <Toggle checked={header.cta.show} onChange={(v) => setH({ cta: { ...header.cta, show: v } })} label="Show button" />
          <Field label="Label">
            <TextInput value={header.cta.label} onChange={(v) => setH({ cta: { ...header.cta, label: v } })} />
          </Field>
          <Field label="Link">
            <TextInput value={header.cta.href} onChange={(v) => setH({ cta: { ...header.cta, href: v } })} mono />
          </Field>
        </Grid>
        <div className="mt-4">
          <MediaPicker mediaKey="logo" label="Round tree logo" allowVideo={false} compact hint="used everywhere" />
        </div>
      </Panel>
      <Panel title="Footer" blurb="Footer text, links, socials and the service-charge note that also appears on the menu pages and in checkout.">
        <Grid cols={2}>
          <Field label="Brand">
            <TextInput value={footer.brand} onChange={(v) => setF({ brand: v })} />
          </Field>
          <Field label="Brand suffix">
            <TextInput value={footer.brandSub} onChange={(v) => setF({ brandSub: v })} />
          </Field>
          <Field label="Tagline">
            <TextInput value={footer.tagline} onChange={(v) => setF({ tagline: v })} />
          </Field>
          <Field label="Handwritten note" hint="Line breaks are kept">
            <TextArea value={footer.handwritten} onChange={(v) => setF({ handwritten: v })} rows={3} />
          </Field>
          <Field label="Service charge note">
            <TextInput value={footer.serviceNote} onChange={(v) => setF({ serviceNote: v })} />
          </Field>
          <Field label="Thank-you line">
            <TextInput value={footer.thanks} onChange={(v) => setF({ thanks: v })} />
          </Field>
          <Field label="Copyright line" hint="{year} is replaced with the current year">
            <TextInput value={footer.copyright} onChange={(v) => setF({ copyright: v })} />
          </Field>
        </Grid>
        <p className="kicker mt-5 mb-2 text-muted">Footer links</p>
        <NavEditor items={footer.nav} onChange={(nav) => setF({ nav })} />
        <p className="kicker mt-5 mb-2 text-muted">Footer blocks</p>
        <Grid cols={4}>
          <Toggle checked={footer.show.contact} onChange={(v) => setF({ show: { ...footer.show, contact: v } })} label="Contact & support" />
          <Toggle checked={footer.show.location} onChange={(v) => setF({ show: { ...footer.show, location: v } })} label="Location & hours" />
          <Toggle checked={footer.show.social} onChange={(v) => setF({ show: { ...footer.show, social: v } })} label="Social media" />
          <Toggle checked={footer.show.reviews} onChange={(v) => setF({ show: { ...footer.show, reviews: v } })} label="Review platforms" />
        </Grid>
        <div className="mt-3">
          <Toggle checked={footer.show.onMenuPages} onChange={(v) => setF({ show: { ...footer.show, onMenuPages: v } })} label="Also show the full footer on the menu pages" hint="Menu pages keep their reference footers; this adds the full contact footer underneath" />
        </div>
      </Panel>

      <Panel title="Footer · Contact & Support" blurb="Phone becomes a tap-to-call link and email a mail link.">
        <Grid cols={2}>
          <Field label="Column title">
            <TextInput value={footer.contact.title} onChange={(v) => setC({ title: v })} />
          </Field>
          <Field label="Phone number">
            <TextInput value={footer.contact.phone} onChange={(v) => setC({ phone: v })} mono />
          </Field>
          <Field label="Email address">
            <TextInput value={footer.contact.email} onChange={(v) => setC({ email: v })} mono />
          </Field>
          <Field label="Email note" hint="Shown under the address, e.g. “General & booking inquiries”">
            <TextInput value={footer.contact.emailNote} onChange={(v) => setC({ emailNote: v })} />
          </Field>
          <Field label="Support label">
            <TextInput value={footer.contact.supportLabel} onChange={(v) => setC({ supportLabel: v })} />
          </Field>
          <Field label="Support note" hint="e.g. the adults-only policy">
            <TextInput value={footer.contact.supportNote} onChange={(v) => setC({ supportNote: v })} />
          </Field>
        </Grid>
      </Panel>

      <Panel title="Footer · Location & Hours">
        <Grid cols={2}>
          <Field label="Column title">
            <TextInput value={footer.location.title} onChange={(v) => setL({ title: v })} />
          </Field>
          <Field label="Physical address" hint="Line breaks are kept">
            <TextArea value={footer.location.address} onChange={(v) => setL({ address: v })} rows={3} />
          </Field>
          <Field label="Hours label">
            <TextInput value={footer.location.hoursLabel} onChange={(v) => setL({ hoursLabel: v })} />
          </Field>
          <Field label="Hours">
            <TextInput value={footer.location.hours} onChange={(v) => setL({ hours: v })} />
          </Field>
          <Field label="Happy hour label">
            <TextInput value={footer.location.happyHourLabel} onChange={(v) => setL({ happyHourLabel: v })} />
          </Field>
          <Field label="Happy hour">
            <TextInput value={footer.location.happyHour} onChange={(v) => setL({ happyHour: v })} />
          </Field>
          <Field label="Directions button label">
            <TextInput value={footer.location.directionsLabel} onChange={(v) => setL({ directionsLabel: v })} />
          </Field>
          <Field label="Map / directions URL" hint="Paste a Google Maps share link, or generate a search link from the address">
            <div className="flex gap-2">
              <TextInput value={footer.location.mapUrl} onChange={(v) => setL({ mapUrl: v.trim() })} mono />
              <Btn small onClick={() => setL({ mapUrl: mapsSearchUrl(footer.location.address) })} title="Build a Google Maps search link from the address">
                Generate
              </Btn>
            </div>
          </Field>
        </Grid>
      </Panel>

      <Panel title="Footer · Social Media Connect" blurb="Lucide-style icons for each network. Paste the full profile URL — networks without a URL are hidden on the site.">
        <Field label="Column title" className="mb-4 max-w-[360px]">
          <TextInput value={footer.social.title} onChange={(v) => setF({ social: { ...footer.social, title: v } })} />
        </Field>
        <SocialLinksEditor items={footer.social.links} onChange={(links) => setF({ social: { ...footer.social, links } })} kind="social" />
      </Panel>

      <Panel title="Footer · Review Platforms" blurb="Tripadvisor, Hostelworld, Booking.com… Paste each listing URL. Entries without a URL show as plain text until the link is added.">
        <Field label="Title" className="mb-4 max-w-[360px]">
          <TextInput value={footer.reviews.title} onChange={(v) => setF({ reviews: { ...footer.reviews, title: v } })} />
        </Field>
        <SocialLinksEditor items={footer.reviews.links} onChange={(links) => setF({ reviews: { ...footer.reviews, links } })} kind="review" />
      </Panel>
      <Panel title="SEO" blurb="Browser tab title and search description.">
        <Grid cols={2}>
          <Field label="Title">
            <TextInput value={seo.title} onChange={(v) => updateDraft((c) => ({ ...c, seo: { ...c.seo, title: v } }))} />
          </Field>
          <Field label="Description">
            <TextArea value={seo.description} onChange={(v) => updateDraft((c) => ({ ...c, seo: { ...c.seo, description: v } }))} rows={2} />
          </Field>
        </Grid>
      </Panel>
    </>
  );
}

/* ----------------------------------- Home ----------------------------------- */
export function HomePanel() {
  const { config, updateDraft } = useSite();
  const h = config.home;
  const set = <K extends keyof typeof h>(k: K, patch: Partial<(typeof h)[K]>) => updateDraft((c) => ({ ...c, home: { ...c.home, [k]: { ...c.home[k], ...patch } } }));
  const mediaOpts = mediaKeyOptions(config, MEDIA_SLOTS);
  return (
    <>
      <Panel title="Hero" actions={<Toggle checked={h.hero.show} onChange={(v) => set("hero", { show: v })} label="Visible" />}>
        <Grid cols={2}>
          <Field label="Big word · line 1">
            <TextInput value={h.hero.line1} onChange={(v) => set("hero", { line1: v })} />
          </Field>
          <Field label="Big word · line 2">
            <TextInput value={h.hero.line2} onChange={(v) => set("hero", { line2: v })} />
          </Field>
          <Field label="Tagline (right)" hint="Line breaks are kept">
            <TextArea value={h.hero.tagline} onChange={(v) => set("hero", { tagline: v })} rows={3} />
          </Field>
          <Field label="Handwritten note (left)">
            <TextArea value={h.hero.noteLeft} onChange={(v) => set("hero", { noteLeft: v })} rows={3} />
          </Field>
          <Field label="Handwritten note (right)">
            <TextArea value={h.hero.noteRight} onChange={(v) => set("hero", { noteRight: v })} rows={3} />
          </Field>
          <Field label="Curved caption around the pizza">
            <TextInput value={h.hero.arcText} onChange={(v) => set("hero", { arcText: v })} />
          </Field>
          <Field label="Button label">
            <TextInput value={h.hero.ctaLabel} onChange={(v) => set("hero", { ctaLabel: v })} />
          </Field>
          <Field label="Button link">
            <TextInput value={h.hero.ctaHref} onChange={(v) => set("hero", { ctaHref: v })} mono />
          </Field>
        </Grid>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Toggle checked={h.hero.spin} onChange={(v) => set("hero", { spin: v })} label="Slow pizza rotation" hint="Automatically off for visitors with reduced motion" />
          <MediaPicker mediaKey="hero-pizza" label="Hero pizza cutout" allowVideo={false} compact hint="PNG with transparency" />
        </div>
      </Panel>
      <Panel title="Marquee band" actions={<Toggle checked={h.marquee.show} onChange={(v) => set("marquee", { show: v })} label="Visible" />}>
        <Field label="Text">
          <TextInput value={h.marquee.text} onChange={(v) => set("marquee", { text: v })} />
        </Field>
      </Panel>
      <Panel title="The Place" actions={<Toggle checked={h.place.show} onChange={(v) => set("place", { show: v })} label="Visible" />}>
        <Grid cols={3}>
          <Field label="Yellow label">
            <TextArea value={h.place.label} onChange={(v) => set("place", { label: v })} rows={2} />
          </Field>
          <Field label="Vertical text">
            <TextInput value={h.place.vertical} onChange={(v) => set("place", { vertical: v })} />
          </Field>
          <Field label="Full-width headline">
            <TextInput value={h.place.bigText} onChange={(v) => set("place", { bigText: v })} />
          </Field>
        </Grid>
        <div className="mt-4">
          <MediaPicker mediaKey="the-place" label="Dining room photo or ambient video" compact />
        </div>
      </Panel>
      <Panel title="A little of everything" actions={<Toggle checked={h.everything.show} onChange={(v) => set("everything", { show: v })} label="Visible" />}>
        <Grid cols={2}>
          <Field label="Heading">
            <TextArea value={h.everything.title} onChange={(v) => set("everything", { title: v })} rows={2} />
          </Field>
          <Field label="Kicker">
            <TextArea value={h.everything.kicker} onChange={(v) => set("everything", { kicker: v })} rows={3} />
          </Field>
          <Field label="Link label">
            <TextInput value={h.everything.ctaLabel} onChange={(v) => set("everything", { ctaLabel: v })} />
          </Field>
          <Field label="Handwritten note">
            <TextArea value={h.everything.note} onChange={(v) => set("everything", { note: v })} rows={2} />
          </Field>
        </Grid>
        <p className="kicker mt-5 mb-2 text-muted">Carousel tabs</p>
        <ListEditor
          items={h.everything.tabs}
          onChange={(tabs) => set("everything", { tabs })}
          create={() => ({ id: uid("tab_"), num: String(h.everything.tabs.length + 1).padStart(2, "0"), label: "New", href: "/menu/pasta", main: "pasta-plate", round: "salad-plate" })}
          summary={(t) => `${t.num} / ${t.label}`}
          addLabel="Add tab"
          render={(t, update) => (
            <Grid cols={2}>
              <Field label="Number">
                <TextInput value={t.num} onChange={(v) => update({ num: v })} />
              </Field>
              <Field label="Label">
                <TextInput value={t.label} onChange={(v) => update({ label: v })} />
              </Field>
              <Field label="Link">
                <TextInput value={t.href} onChange={(v) => update({ href: v })} mono />
              </Field>
              <div />
              <Field label="Main photo">
                <Select value={t.main} onChange={(v) => update({ main: v })} options={mediaOpts} />
              </Field>
              <Field label="Round plate photo">
                <Select value={t.round} onChange={(v) => update({ round: v })} options={mediaOpts} />
              </Field>
            </Grid>
          )}
        />
      </Panel>
      <Panel title="See you at the table" actions={<Toggle checked={h.seeYou.show} onChange={(v) => set("seeYou", { show: v })} label="Visible" />}>
        <Grid cols={2}>
          <Field label="Heading">
            <TextArea value={h.seeYou.title} onChange={(v) => set("seeYou", { title: v })} rows={2} />
          </Field>
          <Field label="Text">
            <TextArea value={h.seeYou.text} onChange={(v) => set("seeYou", { text: v })} rows={3} />
          </Field>
          <Field label="Button label">
            <TextInput value={h.seeYou.ctaLabel} onChange={(v) => set("seeYou", { ctaLabel: v })} />
          </Field>
          <Field label="Button link" hint="tel:+63… makes it a real call button">
            <TextInput value={h.seeYou.ctaHref} onChange={(v) => set("seeYou", { ctaHref: v })} mono />
          </Field>
        </Grid>
        <div className="mt-4">
          <MediaPicker mediaKey="plants" label="Tropical leaves cutout" allowVideo={false} compact />
        </div>
      </Panel>
    </>
  );
}

/* ---------------------------------- Media ----------------------------------- */
export function MediaPanel() {
  const { config } = useSite();
  const { backend } = useApp();
  const slotKeys = new Set(MEDIA_SLOTS.map((s) => s.key));
  const others = Object.keys(config.media).filter((k) => !slotKeys.has(k));
  return (
    <>
      <Panel
        title="Photo placements"
        blurb={`Every photograph slot from the reference layouts. Upload from your device (images are resized to 1800px; PNG keeps transparency), paste a URL, or download the current file. ${
          backend?.provider === "demo" ? "Demo mode stores files in this browser (IndexedDB)." : backend?.provider === "supabase" ? "Files go to the Supabase 'media' storage bucket." : "Files are saved to server/data/uploads."
        }`}
      >
        <Grid cols={2}>
          {MEDIA_SLOTS.map((s) => (
            <MediaPicker key={s.key} mediaKey={s.key} label={s.label} hint={s.where} allowVideo={s.video} />
          ))}
        </Grid>
      </Panel>
      <Panel title="Section media" blurb="Files uploaded inside custom sections (galleries, blog covers, videos).">
        {others.length === 0 ? (
          <p className="text-[13px] text-muted">None yet — add a Gallery, Blog or Video section and upload there.</p>
        ) : (
          <Grid cols={2}>
            {others.map((k) => (
              <MediaPicker key={k} mediaKey={k} label={k} compact />
            ))}
          </Grid>
        )}
      </Panel>
    </>
  );
}

/* ----------------------------------- Menu ----------------------------------- */
const PAGE_OPTS: { value: MenuPage; label: string }[] = [
  { value: "pasta", label: "Pasta page" },
  { value: "pizza", label: "Pizza · burgers · sides · starters page" },
  { value: "drinks", label: "Drinks page" },
];

export function MenuPanel({ go }: { go?: (tab: string) => void }) {
  const { config, updateDraft } = useSite();
  const menu = config.menu;
  const setMenu = (fn: (m: MenuData) => MenuData) => updateDraft((c) => ({ ...c, menu: fn(c.menu) }));
  const setSection = (id: string, patch: Partial<MenuSection>) => setMenu((m) => ({ ...m, sections: m.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const [open, setOpen] = useState<string | null>(menu.sections[0]?.id ?? null);

  const addSection = () => {
    const id = `section-${uid("").slice(0, 6)}`;
    setMenu((m) => ({ ...m, sections: [...m.sections, { id, page: "pizza", group: "", title: "New section", items: [] }] }));
    setOpen(id);
  };
  const moveSection = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= menu.sections.length) return;
    const next = [...menu.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setMenu((m) => ({ ...m, sections: next }));
  };
  const uniqueId = (base: string) => {
    const all = new Set(menu.sections.flatMap((s) => s.items.map((i) => i.id)));
    let id = base || uid("item-");
    let n = 2;
    while (all.has(id)) id = `${base}-${n++}`;
    return id;
  };

  return (
    <>
      <Panel
        title="Menu"
        blurb="Names, prices, descriptions and vegetarian marks. Prices are enforced server-side from the published menu — publish after editing. Availability (86'd items) is toggled live in Staff."
        actions={
          <>
            <Field label="Service charge %">
              <NumberInput value={Math.round(menu.serviceChargeRate * 1000) / 10} onChange={(v) => setMenu((m) => ({ ...m, serviceChargeRate: v === "" ? 0 : Number(v) / 100 }))} min={0} max={30} step={0.5} />
            </Field>
            {go && (
              <Btn onClick={() => go("costing")} title="Cost to us, gross profit and ingredients per product">
                Costs & recipes <Icon.ArrowRight size={13} />
              </Btn>
            )}
            <Btn variant="primary" onClick={addSection}>
              <Icon.Plus size={13} /> Add section
            </Btn>
          </>
        }
      >
        <div className="space-y-2">
          {menu.sections.map((s, i) => {
            const expanded = open === s.id;
            return (
              <div key={s.id} className="rounded-xl border border-line bg-white/40">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button type="button" onClick={() => setOpen(expanded ? null : s.id)} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
                    <span className="cond text-[16px] font-medium uppercase">{s.title || "Untitled"}</span>
                    <span className="ml-2 text-[11px] text-muted">
                      {s.group ? `${s.group} · ` : ""}
                      {PAGE_OPTS.find((p) => p.value === s.page)?.label} · {s.items.length} items{s.variants?.length ? " · glass/bottle" : ""}
                    </span>
                  </button>
                  <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Move up">
                    <Icon.ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveSection(i, 1)} disabled={i === menu.sections.length - 1} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Move down">
                    <Icon.ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Delete section "${s.title}" and its ${s.items.length} items?`) && setMenu((m) => ({ ...m, sections: m.sections.filter((x) => x.id !== s.id) }))}
                    className="grid h-8 w-8 place-items-center rounded-full text-red-700 hover:bg-red-50"
                    aria-label="Delete section"
                  >
                    <Icon.Trash size={14} />
                  </button>
                </div>
                {expanded && (
                  <div className="border-t border-line px-3 py-3">
                    <Grid cols={4}>
                      <Field label="Title">
                        <TextInput value={s.title} onChange={(v) => setSection(s.id, { title: v })} />
                      </Field>
                      <Field label="Group / kicker">
                        <TextInput value={s.group} onChange={(v) => setSection(s.id, { group: v })} />
                      </Field>
                      <Field label="Page">
                        <Select value={s.page} onChange={(v) => setSection(s.id, { page: v as MenuPage })} options={PAGE_OPTS} />
                      </Field>
                      <Field label="Number (pasta style)">
                        <TextInput value={s.number ?? ""} onChange={(v) => setSection(s.id, { number: v || undefined })} />
                      </Field>
                      <Field label="Subtitle">
                        <TextInput value={s.subtitle ?? ""} onChange={(v) => setSection(s.id, { subtitle: v || undefined })} />
                      </Field>
                      <Field label="Note" className="sm:col-span-2">
                        <TextInput value={s.note ?? ""} onChange={(v) => setSection(s.id, { note: v || undefined })} />
                      </Field>
                      <Toggle
                        checked={!!s.variants?.length}
                        onChange={(v) =>
                          setSection(s.id, {
                            variants: v ? ["glass", "bottle"] : undefined,
                            items: s.items.map((it) => (v ? { ...it, price: undefined, prices: it.prices ?? { glass: it.price ?? 0, bottle: it.price ?? 0 } } : { ...it, prices: undefined, price: it.price ?? it.prices?.glass ?? 0 })),
                          })
                        }
                        label="Glass / Bottle prices"
                      />
                    </Grid>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[640px] text-[13px]">
                        <thead>
                          <tr className="kicker text-left text-muted">
                            <th className="pb-2 pr-2 font-medium">Name</th>
                            <th className="pb-2 pr-2 font-medium">Veg</th>
                            {s.variants?.length ? (
                              <>
                                <th className="pb-2 pr-2 font-medium">Glass ₱</th>
                                <th className="pb-2 pr-2 font-medium">Bottle ₱</th>
                              </>
                            ) : (
                              <th className="pb-2 pr-2 font-medium">Price ₱</th>
                            )}
                            <th className="pb-2 pr-2 font-medium">Description</th>
                            <th className="pb-2 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {s.items.map((it, idx) => (
                            <ItemRow
                              key={it.id}
                              item={it}
                              dual={!!s.variants?.length}
                              onChange={(patch) => setSection(s.id, { items: s.items.map((x) => (x.id === it.id ? { ...x, ...patch } : x)) })}
                              onDelete={() => setSection(s.id, { items: s.items.filter((x) => x.id !== it.id) })}
                              onMove={(d) => {
                                const j = idx + d;
                                if (j < 0 || j >= s.items.length) return;
                                const next = [...s.items];
                                [next[idx], next[j]] = [next[j], next[idx]];
                                setSection(s.id, { items: next });
                              }}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Btn
                      small
                      className="mt-3"
                      onClick={() => {
                        const name = "New item";
                        const item: MenuItem = s.variants?.length ? { id: uniqueId(slugify(name)), name, prices: { glass: 0, bottle: 0 } } : { id: uniqueId(slugify(name)), name, price: 0 };
                        setSection(s.id, { items: [...s.items, item] });
                      }}
                    >
                      <Icon.Plus size={13} /> Add item
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}

function ItemRow({ item, dual, onChange, onDelete, onMove }: { item: MenuItem; dual: boolean; onChange: (p: Partial<MenuItem>) => void; onDelete: () => void; onMove: (d: -1 | 1) => void }) {
  const cell = "w-full rounded-md border border-ink/15 bg-white/70 px-2 py-1.5 outline-none focus:border-ink";
  return (
    <tr className="border-t border-line align-top">
      <td className="py-1.5 pr-2">
        <input value={item.name} onChange={(e) => onChange({ name: e.target.value })} className={cn(cell, "min-w-[160px]")} aria-label="Item name" />
      </td>
      <td className="py-1.5 pr-2">
        <input type="checkbox" checked={!!item.vegetarian} onChange={(e) => onChange({ vegetarian: e.target.checked || undefined })} className="mt-2 h-4 w-4 accent-green-600" aria-label="Vegetarian" />
      </td>
      {dual ? (
        <>
          <td className="py-1.5 pr-2">
            <input type="number" min={0} value={item.prices?.glass ?? 0} onChange={(e) => onChange({ prices: { glass: Number(e.target.value), bottle: item.prices?.bottle ?? 0 } })} className={cn(cell, "w-[84px] tabular-nums")} aria-label="Glass price" />
          </td>
          <td className="py-1.5 pr-2">
            <input type="number" min={0} value={item.prices?.bottle ?? 0} onChange={(e) => onChange({ prices: { glass: item.prices?.glass ?? 0, bottle: Number(e.target.value) } })} className={cn(cell, "w-[92px] tabular-nums")} aria-label="Bottle price" />
          </td>
        </>
      ) : (
        <td className="py-1.5 pr-2">
          <input type="number" min={0} value={item.price ?? 0} onChange={(e) => onChange({ price: Number(e.target.value) })} className={cn(cell, "w-[84px] tabular-nums")} aria-label="Price" />
        </td>
      )}
      <td className="py-1.5 pr-2">
        <input value={item.description ?? ""} onChange={(e) => onChange({ description: e.target.value || undefined })} className={cn(cell, "min-w-[220px]")} aria-label="Description" placeholder="Optional description" />
      </td>
      <td className="whitespace-nowrap py-1.5">
        <button type="button" onClick={() => onMove(-1)} className="rounded-full p-1.5 hover:bg-ink/10" aria-label="Move up">
          <Icon.ArrowUp size={13} />
        </button>
        <button type="button" onClick={() => onMove(1)} className="rounded-full p-1.5 hover:bg-ink/10" aria-label="Move down">
          <Icon.ArrowDown size={13} />
        </button>
        <button type="button" onClick={onDelete} className="rounded-full p-1.5 text-red-700 hover:bg-red-50" aria-label="Delete item">
          <Icon.Trash size={13} />
        </button>
      </td>
    </tr>
  );
}

/* ---------------------------------- Publish --------------------------------- */
export function PublishPanel({ onPublish, publishing }: { onPublish: () => void; publishing: boolean }) {
  const { backend, mode, toast } = useApp();
  const { config, hasDraft, isDirty, discardDraft, importConfig, resetToDefaults, published } = useSite();
  const fileRef = useRef<HTMLInputElement>(null);
  const size = formatBytes(new Blob([JSON.stringify(config)]).size);
  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as Partial<SiteConfig>;
      if (!parsed || typeof parsed !== "object" || !("theme" in parsed)) throw new Error("Not a site export");
      importConfig(parsed);
      toast("Imported into draft — review, then Publish.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <>
      <Panel
        title="Publish"
        blurb="Your edits are saved as a draft in this browser and previewed here live. Publishing writes the whole configuration (texts, theme, menu, sections, media references) to storage so every visitor sees it."
        actions={
          <>
            <Btn variant="danger" onClick={() => hasDraft && window.confirm("Discard all unpublished changes?") && discardDraft()} disabled={!hasDraft}>
              Discard draft
            </Btn>
            <Btn variant="primary" onClick={onPublish} disabled={publishing || !backend}>
              {publishing ? "Publishing…" : "Publish now"}
            </Btn>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoCard title="Storage" state={mode === "live" ? "ok" : "warn"} text={backend?.description ?? "connecting…"} />
          <InfoCard title="Draft" state={isDirty ? "warn" : "ok"} text={isDirty ? "Unpublished changes" : hasDraft ? "Same as published" : "No draft"} />
          <InfoCard title="Config size" state={new Blob([JSON.stringify(config)]).size > 4_000_000 ? "warn" : "ok"} text={`${size} · published ${new Date(published.updatedAt).toLocaleString()}`} />
        </div>
        {mode === "demo" && (
          <p className="mt-4 rounded-xl border border-yellow bg-yellow/20 px-3 py-2 text-[12.5px] leading-snug">
            <strong>Demo storage.</strong> Publishing here saves to this browser only. For a real site run <code className="rounded bg-ink/10 px-1">node server/index.mjs</code> (file storage) or connect Supabase — see the checklist below.
          </p>
        )}
      </Panel>
      <Panel title="Export / import / reset" blurb="Download the full configuration as JSON (a portable backup you can re-import on another install).">
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => downloadText(`guni-guni-site-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(config, null, 2))}>
            <Icon.Download size={14} /> Export site JSON
          </Btn>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => void onImport(e.target.files?.[0])} />
          <Btn onClick={() => fileRef.current?.click()}>
            <Icon.Upload size={14} /> Import JSON
          </Btn>
          <Btn variant="danger" onClick={() => window.confirm("Reset the draft to the original reference content? Media uploads stay in storage.") && resetToDefaults()}>
            Reset draft to defaults
          </Btn>
        </div>
      </Panel>
      <Panel title="Supabase checklist" blurb="The repository ships a ready Supabase tree: supabase/migrations (schema, RLS, storage bucket), supabase/functions (place-order, agent-chat) and src/lib/supabaseBackend.ts.">
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px]">
          <li>
            Create a project, then <code className="rounded bg-ink/10 px-1">supabase link</code> and <code className="rounded bg-ink/10 px-1">supabase db push</code>.
          </li>
          <li>
            Deploy functions: <code className="rounded bg-ink/10 px-1">supabase functions deploy place-order agent-chat</code>.
          </li>
          <li>
            Secrets: <code className="rounded bg-ink/10 px-1">supabase secrets set OPENROUTER_API_KEY=sk-or-…</code>.
          </li>
          <li>
            Create a staff user in Auth → Users, then <code className="rounded bg-ink/10 px-1">insert into staff_users (user_id, role) values ('&lt;uuid&gt;', 'admin');</code>
          </li>
          <li>
            Put <code className="rounded bg-ink/10 px-1">VITE_SUPABASE_URL</code> and <code className="rounded bg-ink/10 px-1">VITE_SUPABASE_ANON_KEY</code> in <code className="rounded bg-ink/10 px-1">.env</code>, rebuild, sign in here and Publish once (seeds the menu used for price validation).
          </li>
        </ol>
        <p className="mt-3">
          <StatusDot state={SUPABASE_ENV.url ? "ok" : "idle"} label={SUPABASE_ENV.url ? `Env configured: ${SUPABASE_HOST}` : "Supabase env not set in this build"} />
        </p>
      </Panel>
    </>
  );
}

function InfoCard({ title, state, text }: { title: string; state: "ok" | "warn" | "bad" | "idle"; text: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/40 p-3">
      <p className="kicker text-muted">{title}</p>
      <p className="mt-1 text-[13px]">
        <StatusDot state={state} label={text} />
      </p>
    </div>
  );
}
