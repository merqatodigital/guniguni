import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { useSite } from "@/context/SiteContext";
import { PLACEMENT_META, RESERVED_SLUGS, SECTION_TYPES, createSection, type KnowledgeFile, type Page, type Placement, type Section, type SectionType, type Tone } from "@/data/site";
import { slugify } from "@/data/menu";
import { uid } from "@/lib/format";
import { formatBytes, readFileText, stripHtml } from "@/lib/media";
import {
  EXAMPLE_FILENAME,
  TEMPLATE_FILENAME,
  buildAiPrompt,
  buildExampleMd,
  buildTemplateMd,
  looksLikeTemplate,
  parseBulkKnowledge,
  toKnowledgeFiles,
} from "@/lib/knowledgeTemplate";
import { ApiError, type SecretStatus } from "@/lib/backend";
import { FALLBACK_MODELS, fetchModels, groupModels, priceLabel, type ORModel } from "@/lib/openrouter";
import { DEFAULT_SKILLS, DEFAULT_TASKS, mergeSkills, newTask, type AgentTask, type SkillId, type TaskWhen } from "@/data/agentSkills";
import { cleanAgentText } from "@/lib/cleanText";
import { Icon } from "@/components/ui";
import { Btn, Field, Grid, ListEditor, MediaPicker, Panel, Select, StatusDot, TextArea, TextInput, Toggle, useAdminToken } from "./fields";

/* --------------------------------- Sections --------------------------------- */
export function SectionsPanel() {
  const { config, updateDraft } = useSite();
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const setSections = (fn: (s: Section[]) => Section[]) => updateDraft((c) => ({ ...c, sections: fn(c.sections) }));
  const update = (id: string, patch: Partial<Section>) => setSections((list) => list.map((s) => (s.id === id ? ({ ...s, ...patch } as Section) : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= config.sections.length) return;
    const next = [...config.sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(() => next);
  };
  const pageOpts = config.pages.map((p) => ({ value: p.id, label: p.title }));

  return (
    <Panel
      title="Sections"
      blurb="Add blocks like About, Blog, Location, Gallery, Video, FAQ, Hours or a call-to-action band. Place them on the home page or on any custom page, reorder, hide or delete them."
      actions={
        <Btn variant="primary" onClick={() => setAdding((a) => !a)}>
          <Icon.Plus size={13} /> Add section
        </Btn>
      }
    >
      {adding && (
        <div className="mb-4 grid gap-2 rounded-xl border border-yellow bg-yellow/15 p-3 sm:grid-cols-3">
          {SECTION_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              onClick={() => {
                const s = createSection(t.type as SectionType);
                setSections((list) => [...list, s]);
                setOpen(s.id);
                setAdding(false);
              }}
              className="rounded-lg border border-line bg-cream p-3 text-left hover:border-ink"
            >
              <p className="cond text-[15px] font-medium uppercase">{t.label}</p>
              <p className="mt-0.5 text-[11.5px] text-muted">{t.blurb}</p>
            </button>
          ))}
        </div>
      )}
      {config.sections.length === 0 && !adding && <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">No custom sections yet. Add one to extend the home page or build About / Blog / Location pages.</p>}
      <div className="space-y-2">
        {config.sections.map((s, i) => {
          const expanded = open === s.id;
          const page = config.pages.find((p) => p.id === s.pageId);
          return (
            <div key={s.id} className={cn("rounded-xl border bg-white/40", s.visible ? "border-line" : "border-dashed border-ink/30 opacity-70")}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpen(expanded ? null : s.id)} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
                  <span className="mr-2 rounded bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">{SECTION_TYPES.find((t) => t.type === s.type)?.label}</span>
                  <span className="text-[14px] font-medium">{s.title.split("\n")[0] || "Untitled"}</span>
                  <span className="ml-2 text-[11px] text-muted">
                    {s.placement === "page" ? (page ? `Page: ${page.title}` : "Page: (unassigned)") : PLACEMENT_META.find((p) => p.value === s.placement)?.label}
                    {!s.visible && " · hidden"}
                  </span>
                </button>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Move up">
                  <Icon.ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === config.sections.length - 1} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Move down">
                  <Icon.ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => window.confirm(`Delete section "${s.title}"?`) && setSections((list) => list.filter((x) => x.id !== s.id))} className="grid h-8 w-8 place-items-center rounded-full text-red-700 hover:bg-red-50" aria-label="Delete section">
                  <Icon.Trash size={14} />
                </button>
              </div>
              {expanded && (
                <div className="space-y-4 border-t border-line px-3 py-3">
                  <Grid cols={4}>
                    <Toggle checked={s.visible} onChange={(v) => update(s.id, { visible: v })} label="Visible" />
                    <Field label="Placement">
                      <Select value={s.placement} onChange={(v) => update(s.id, { placement: v as Placement })} options={PLACEMENT_META} />
                    </Field>
                    <Field label="Page" hint={config.pages.length ? undefined : "Create a page in Pages first"}>
                      <Select value={s.pageId} onChange={(v) => update(s.id, { pageId: v })} options={[{ value: "", label: "—" }, ...pageOpts]} disabled={s.placement !== "page"} />
                    </Field>
                    <Field label="Tone">
                      <Select value={s.tone} onChange={(v) => update(s.id, { tone: v as Tone })} options={[{ value: "cream", label: "Cream" }, { value: "yellow", label: "Accent" }, { value: "ink", label: "Ink (dark)" }]} />
                    </Field>
                  </Grid>
                  <Grid cols={2}>
                    <Field label="Kicker (small caps line)">
                      <TextInput value={s.kicker} onChange={(v) => update(s.id, { kicker: v })} />
                    </Field>
                    <Field label="Heading" hint="Line breaks are kept">
                      <TextArea value={s.title} onChange={(v) => update(s.id, { title: v })} rows={2} />
                    </Field>
                  </Grid>
                  <SectionFields section={s} update={(patch) => update(s.id, patch)} />
                  <p className="text-[11px] text-muted">
                    Preview:{" "}
                    <Link to={s.placement === "page" && page ? `/${page.slug}#s-${s.id}` : `/#s-${s.id}`} className="underline">
                      open on site
                    </Link>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function SectionFields({ section: s, update }: { section: Section; update: (patch: Partial<Section>) => void }) {
  switch (s.type) {
    case "text":
      return (
        <>
          <Field label="Body" hint="Blank line = new paragraph">
            <TextArea value={s.body} onChange={(v) => update({ body: v } as Partial<Section>)} rows={6} />
          </Field>
          <Grid cols={2}>
            <Field label="Handwritten note">
              <TextInput value={s.handwritten} onChange={(v) => update({ handwritten: v } as Partial<Section>)} />
            </Field>
            <Field label="Photo side">
              <Select value={s.mediaSide} onChange={(v) => update({ mediaSide: v as "left" | "right" } as Partial<Section>)} options={[{ value: "right", label: "Right" }, { value: "left", label: "Left" }]} />
            </Field>
          </Grid>
          <SectionMedia mediaKey={`sec-${s.id}-media`} current={s.media} label="Photo or video" onUse={(k) => update({ media: k } as Partial<Section>)} />
        </>
      );
    case "blog":
      return (
        <ListEditor
          items={s.posts}
          onChange={(posts) => update({ posts } as Partial<Section>)}
          create={() => ({ id: uid("post_"), title: "New post", date: new Date().toISOString().slice(0, 10), excerpt: "", body: "", cover: "" })}
          summary={(p) => `${p.date} · ${p.title}`}
          addLabel="Add post"
          render={(p, up) => (
            <div className="space-y-3">
              <Grid cols={2}>
                <Field label="Title">
                  <TextInput value={p.title} onChange={(v) => up({ title: v })} />
                </Field>
                <Field label="Date">
                  <TextInput value={p.date} onChange={(v) => up({ date: v })} type="date" />
                </Field>
              </Grid>
              <Field label="Excerpt">
                <TextArea value={p.excerpt} onChange={(v) => up({ excerpt: v })} rows={2} />
              </Field>
              <Field label="Story" hint="Blank line = new paragraph">
                <TextArea value={p.body} onChange={(v) => up({ body: v })} rows={6} />
              </Field>
              <SectionMedia mediaKey={`post-${p.id}`} current={p.cover} label="Cover image" onUse={(k) => up({ cover: k })} allowVideo={false} />
            </div>
          )}
        />
      );
    case "location":
      return (
        <>
          <Grid cols={2}>
            <Field label="Address">
              <TextArea value={s.address} onChange={(v) => update({ address: v } as Partial<Section>)} rows={3} />
            </Field>
            <Field label="Hours (short)">
              <TextArea value={s.hours} onChange={(v) => update({ hours: v } as Partial<Section>)} rows={3} />
            </Field>
            <Field label="Phone">
              <TextInput value={s.phone} onChange={(v) => update({ phone: v } as Partial<Section>)} mono />
            </Field>
            <Field label="Directions link" hint="e.g. a Google Maps share link">
              <TextInput value={s.directionsUrl} onChange={(v) => update({ directionsUrl: v } as Partial<Section>)} mono />
            </Field>
          </Grid>
          <Field label="Map embed URL" hint="Google Maps → Share → Embed a map → copy the src=&quot;…&quot; URL">
            <TextInput value={s.mapEmbedUrl} onChange={(v) => update({ mapEmbedUrl: v } as Partial<Section>)} mono />
          </Field>
          <SectionMedia mediaKey={`sec-${s.id}-media`} current={s.media} label="Photo (used when no map URL)" onUse={(k) => update({ media: k } as Partial<Section>)} />
        </>
      );
    case "gallery":
      return (
        <ListEditor
          items={s.items}
          onChange={(items) => update({ items } as Partial<Section>)}
          create={() => ({ id: uid("gal_"), media: "", caption: "" })}
          summary={(it) => it.caption || it.media || "Photo"}
          addLabel="Add photo / video"
          render={(it, up) => (
            <div className="space-y-3">
              <Field label="Caption">
                <TextInput value={it.caption} onChange={(v) => up({ caption: v })} />
              </Field>
              <SectionMedia mediaKey={`gal-${it.id}`} current={it.media} label="Media" onUse={(k) => up({ media: k })} />
            </div>
          )}
        />
      );
    case "video":
      return (
        <>
          <Field label="Caption">
            <TextInput value={s.caption} onChange={(v) => update({ caption: v } as Partial<Section>)} />
          </Field>
          <SectionMedia mediaKey={`sec-${s.id}-video`} current={s.media} label="Video file or YouTube / Vimeo URL" onUse={(k) => update({ media: k } as Partial<Section>)} />
        </>
      );
    case "faq":
      return (
        <ListEditor
          items={s.items}
          onChange={(items) => update({ items } as Partial<Section>)}
          create={() => ({ id: uid("faq_"), q: "Question?", a: "" })}
          summary={(it) => it.q}
          addLabel="Add question"
          render={(it, up) => (
            <div className="space-y-3">
              <Field label="Question">
                <TextInput value={it.q} onChange={(v) => up({ q: v })} />
              </Field>
              <Field label="Answer">
                <TextArea value={it.a} onChange={(v) => up({ a: v })} rows={3} />
              </Field>
            </div>
          )}
        />
      );
    case "hours":
      return (
        <>
          <ListEditor
            items={s.rows}
            onChange={(rows) => update({ rows } as Partial<Section>)}
            create={() => ({ id: uid("h_"), day: "Day", hours: "" })}
            addLabel="Add row"
            render={(r, up) => (
              <Grid cols={2}>
                <TextInput value={r.day} onChange={(v) => up({ day: v })} placeholder="Day" />
                <TextInput value={r.hours} onChange={(v) => up({ hours: v })} placeholder="7:00 AM – 11:00 PM" />
              </Grid>
            )}
          />
          <Field label="Note">
            <TextInput value={s.note} onChange={(v) => update({ note: v } as Partial<Section>)} />
          </Field>
        </>
      );
    case "cta":
      return (
        <Grid cols={3}>
          <Field label="Text">
            <TextArea value={s.text} onChange={(v) => update({ text: v } as Partial<Section>)} rows={3} />
          </Field>
          <Field label="Button label">
            <TextInput value={s.ctaLabel} onChange={(v) => update({ ctaLabel: v } as Partial<Section>)} />
          </Field>
          <Field label="Button link">
            <TextInput value={s.ctaHref} onChange={(v) => update({ ctaHref: v } as Partial<Section>)} mono />
          </Field>
        </Grid>
      );
    case "contact":
      return (
        <Grid cols={2}>
          <Field label="Text" className="sm:col-span-2">
            <TextArea value={s.text} onChange={(v) => update({ text: v } as Partial<Section>)} rows={3} />
          </Field>
          <Field label="Email">
            <TextInput value={s.email} onChange={(v) => update({ email: v } as Partial<Section>)} mono />
          </Field>
          <Field label="Phone">
            <TextInput value={s.phone} onChange={(v) => update({ phone: v } as Partial<Section>)} mono />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <TextArea value={s.address} onChange={(v) => update({ address: v } as Partial<Section>)} rows={2} />
          </Field>
        </Grid>
      );
  }
}

/** Media picker bound to a section field: uploads under a stable key and stores that key in the section. */
function SectionMedia({ mediaKey, current, label, onUse, allowVideo = true }: { mediaKey: string; current: string; label: string; onUse: (key: string) => void; allowVideo?: boolean }) {
  const { config } = useSite();
  const has = !!config.media[mediaKey];
  useEffect(() => {
    if (has && current !== mediaKey) onUse(mediaKey);
    if (!has && current === mediaKey) onUse("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [has]);
  return <MediaPicker mediaKey={mediaKey} label={label} allowVideo={allowVideo} compact hint={has ? "in use" : "empty"} />;
}

/* ----------------------------------- Pages ---------------------------------- */
export function PagesPanel() {
  const { config, updateDraft } = useSite();
  const setPages = (pages: Page[]) => updateDraft((c) => ({ ...c, pages }));
  return (
    <Panel title="Pages" blurb="Custom pages such as About, Blog or Location live at /#/<slug>. Assign sections to them under Sections. Pages marked “show in navigation” appear in the header automatically.">
      <ListEditor
        items={config.pages}
        onChange={setPages}
        create={() => ({ id: uid("page_"), slug: `page-${config.pages.length + 1}`, title: "New page", subtitle: "", showInNav: true })}
        summary={(p) => `${p.title} — /${p.slug}`}
        addLabel="Add page"
        render={(p, up) => {
          const bad = RESERVED_SLUGS.includes(p.slug) || !p.slug || config.pages.some((x) => x.id !== p.id && x.slug === p.slug);
          const count = config.sections.filter((s) => s.placement === "page" && s.pageId === p.id).length;
          return (
            <div className="space-y-3">
              <Grid cols={3}>
                <Field label="Title">
                  <TextInput value={p.title} onChange={(v) => up({ title: v, slug: p.slug.startsWith("page-") ? slugify(v) : p.slug })} />
                </Field>
                <Field label="Slug" hint={bad ? "Slug is reserved, empty or already used" : `/#/${p.slug}`}>
                  <TextInput value={p.slug} onChange={(v) => up({ slug: slugify(v) })} mono />
                </Field>
                <Toggle checked={p.showInNav} onChange={(v) => up({ showInNav: v })} label="Show in navigation" />
              </Grid>
              <Field label="Subtitle">
                <TextInput value={p.subtitle} onChange={(v) => up({ subtitle: v })} />
              </Field>
              <p className="text-[11.5px] text-muted">
                {count} section{count === 1 ? "" : "s"} assigned ·{" "}
                <Link to={`/${p.slug}`} className="underline">
                  open page
                </Link>
              </p>
            </div>
          );
        }}
      />
    </Panel>
  );
}

/* --------------------------------- AI agent --------------------------------- */
const ACCEPT_KNOWLEDGE = ".txt,.md,.markdown,.csv,.json,.html,.htm";
const MAX_KNOWLEDGE_CHARS = 60_000;

export function AgentPanel() {
  const { config, updateDraft } = useSite();
  const { backend, mode, toast } = useApp();
  const token = useAdminToken();
  const agent = config.agent;
  const setAgent = (patch: Partial<typeof agent>) => updateDraft((c) => ({ ...c, agent: { ...c.agent, ...patch } }));

  const [secret, setSecret] = useState<SecretStatus | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [models, setModels] = useState<ORModel[] | null>(null);
  const [modelsLive, setModelsLive] = useState(false);
  const [group, setGroup] = useState<"free" | "top" | "paid">("free");
  const [search, setSearch] = useState("");
  const [testing, setTesting] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulkText, setBulkText] = useState("");
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  const [promptCopied, setPromptCopied] = useState(false);
  const [qaQ, setQaQ] = useState("");
  const [qaA, setQaA] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [topicBody, setTopicBody] = useState("");
  const [previewEntry, setPreviewEntry] = useState<string | null>(null);
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const [tplCopied, setTplCopied] = useState<"blank" | "example" | null>(null);
  const [showTpl, setShowTpl] = useState<"blank" | "example" | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    backend?.getSecretStatus(token).then(setSecret).catch(() => setSecret({ configured: false, hint: "" }));
  }, [backend, token]);
  useEffect(() => {
    fetchModels()
      .then((m) => {
        setModels(m);
        setModelsLive(true);
      })
      .catch(() => setModels(FALLBACK_MODELS));
  }, []);

  const groups = useMemo(() => groupModels(models ?? FALLBACK_MODELS), [models]);
  const list = useMemo(() => {
    const src = group === "free" ? groups.free : group === "top" ? groups.top : groups.paid;
    const s = search.trim().toLowerCase();
    return (s ? src.filter((m) => m.id.toLowerCase().includes(s) || m.name.toLowerCase().includes(s)) : src).slice(0, 80);
  }, [groups, group, search]);
  const selected = (models ?? FALLBACK_MODELS).find((m) => m.id === agent.model);
  const keyOk = !!secret?.configured;
  const testOk = !!agent.lastTest?.ok && agent.lastTest.model === agent.model;
  const live = agent.enabled && keyOk && testOk;

  const saveKey = async () => {
    if (!backend) return;
    setSavingKey(true);
    try {
      setSecret(await backend.setSecret(token, keyInput.trim()));
      setKeyInput("");
      toast(keyInput.trim() ? "API key saved." : "API key removed.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save key.");
    } finally {
      setSavingKey(false);
    }
  };
  const test = async () => {
    if (!backend) return;
    setTesting(true);
    try {
      const r = await backend.agentTest(token, agent.model);
      setAgent({
        enabled: r.ok ? true : agent.enabled,
        model: r.ok ? r.model : agent.model,
        lastTest: { ok: r.ok, at: new Date().toISOString(), model: r.model, message: `${r.message}${r.latencyMs ? ` (${r.latencyMs} ms)` : ""}` },
      });
      if (r.ok) toast("Agent is live. “Ask us” is on — Publish so guests see it on every page.");
    } catch (e) {
      setAgent({ lastTest: { ok: false, at: new Date().toISOString(), model: agent.model, message: e instanceof Error ? e.message : "Test failed." } });
    } finally {
      setTesting(false);
    }
  };
  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    const added: KnowledgeFile[] = [];
    let skippedPlaceholders = 0;
    for (const f of Array.from(files)) {
      try {
        let text = await readFileText(f);
        if (/\.html?$/i.test(f.name)) text = stripHtml(text);
        if (/\.json$/i.test(f.name)) {
          try {
            text = JSON.stringify(JSON.parse(text), null, 1);
          } catch {
            /* keep raw */
          }
        }
        // A filled template saved as .md, .markdown or .txt splits into one entry per TOPIC / Q&A block.
        if (!/\.json$/i.test(f.name) && !/\.html?$/i.test(f.name) && looksLikeTemplate(text)) {
          const entries = parseBulkKnowledge(text);
          if (entries.length > 0) {
            added.push(...toKnowledgeFiles(entries, f.name));
            continue;
          }
          if (/\.(md|markdown|txt)$/i.test(f.name)) {
            skippedPlaceholders += 1;
            continue;
          }
        }
        added.push({ id: uid("kb_"), name: f.name, size: f.size, text: text.slice(0, MAX_KNOWLEDGE_CHARS), addedAt: new Date().toISOString() });
      } catch {
        toast(`Could not read ${f.name}`);
      }
    }
    if (added.length) {
      setAgent({ knowledge: [...agent.knowledge, ...added] });
      toast(`Added ${added.length} knowledge entr${added.length === 1 ? "y" : "ies"}. Publish so the assistant uses them.`);
    } else if (skippedPlaceholders > 0) {
      toast("That template still has placeholders — fill in a TOPIC or Q&A block first.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const copyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildAiPrompt());
    } catch {
      const ta = document.createElement("textarea");
      ta.value = buildAiPrompt();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setPromptCopied(true);
    window.setTimeout(() => setPromptCopied(false), 2500);
  };

  const copyText = async (text: string, which: "blank" | "example" | "prompt") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard blocked — viewer below is the fallback */
      }
      ta.remove();
    }
    if (which !== "prompt") {
      setTplCopied(which);
      window.setTimeout(() => setTplCopied(null), 2500);
    }
  };

  /**
   * Save the template as a real file. Tries the File System picker first
   * (no download attribute, works where iframe downloads are blocked),
   * then the classic anchor download, then tells the user about Copy/View.
   */
  const downloadTemplate = async (which: "blank" | "example") => {
    const filename = which === "blank" ? TEMPLATE_FILENAME : EXAMPLE_FILENAME;
    const content = which === "blank" ? buildTemplateMd() : buildExampleMd();
    // 1) File System Access picker — saves straight to disk, no blocked download.
    try {
      const w = window as unknown as {
        showSaveFilePicker?: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (c: string) => Promise<void>; close: () => Promise<void> }> }>;
      };
      if (typeof w.showSaveFilePicker === "function") {
        const handle = await w.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "Markdown template", accept: { "text/markdown": [".md"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        toast(`Saved ${filename}. Fill it in, then upload it in Step 3 below.`);
        return;
      }
    } catch (e) {
      // User pressed Cancel in the save dialog — stop quietly.
      if ((e as { name?: string })?.name === "AbortError") return;
      // Otherwise fall through to the anchor download.
    }
    // 2) Classic download (works when the page is deployed standalone).
    try {
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setTplMsg(
        `If ${filename} did not appear in your Downloads, this preview blocks file downloads — click “Copy” (then paste into Notepad and save as ${filename}), or click “Fill in here” to complete it on this page with no file at all.`,
      );
    } catch {
      setTplMsg(`Download was blocked on this device. Click “Copy” or “Fill in here” instead — same content, no file needed.`);
    }
    window.setTimeout(() => setTplMsg(null), 12000);
  };

  /** Open the template as plain text in a new tab so it can be saved manually. */
  const openTemplateTab = (which: "blank" | "example") => {
    const content = which === "blank" ? buildTemplateMd() : buildExampleMd();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener");
    if (!win) {
      setTplMsg("Pop-ups are blocked — use “Copy” or “Fill in here” instead (same content).");
      window.setTimeout(() => setTplMsg(null), 9000);
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      return;
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const loadTemplateIntoPasteBox = (which: "blank" | "example") => {
    setBulkText(which === "blank" ? buildTemplateMd() : buildExampleMd());
    setBulkMsg(which === "blank" ? "Blank template loaded below — replace the placeholders, then click Add." : "Filled example loaded below — edit it, then click Add.");
    document.getElementById("bulk-paste-box")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const importBulkText = () => {
    const entries = parseBulkKnowledge(bulkText);
    if (entries.length === 0) {
      setBulkMsg("Nothing to add yet — use a ## TOPIC: block or Q: / A: pairs, separated by --- lines.");
      return;
    }
    setAgent({ knowledge: [...agent.knowledge, ...toKnowledgeFiles(entries, "pasted bulk text")] });
    setBulkText("");
    setBulkMsg(`Added ${entries.length} entr${entries.length === 1 ? "y" : "ies"} (${entries.filter((e) => e.kind === "qa").length} Q&A, ${entries.filter((e) => e.kind === "topic").length} topics).`);
    window.setTimeout(() => setBulkMsg(null), 6000);
  };

  const addQaEntry = () => {
    const question = qaQ.trim();
    const answerText = qaA.trim();
    if (!question || !answerText) {
      toast("Type both a question and an answer first.");
      return;
    }
    const text = `Q: ${question}\nA: ${answerText}`;
    setAgent({
      knowledge: [
        ...agent.knowledge,
        { id: uid("kb_"), name: `Q&A — ${question.length > 60 ? question.slice(0, 57) + "…" : question}`, size: new Blob([text]).size, text, addedAt: new Date().toISOString() },
      ],
    });
    setQaQ("");
    setQaA("");
    toast("Q&A added.");
  };

  const addTopicEntry = () => {
    const title = topicTitle.trim();
    const body = topicBody.trim();
    if (!title || !body) {
      toast("Type both a subject title and paragraphs first.");
      return;
    }
    const text = `${title}\n\n${body}`;
    setAgent({
      knowledge: [...agent.knowledge, { id: uid("kb_"), name: title.slice(0, 120), size: new Blob([text]).size, text, addedAt: new Date().toISOString() }],
    });
    setTopicTitle("");
    setTopicBody("");
    toast("Topic added.");
  };

  const kindOf = (k: KnowledgeFile) => (k.name.startsWith("Q&A —") || /^Q:/m.test(k.text) ? "Q&A" : "Topic");
  const ask = async () => {
    if (!backend || !q.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      setAnswer(await backend.agentChat([{ role: "user", content: q.trim() }], config, token));
    } catch (e) {
      setAnswer(`⚠ ${e instanceof ApiError || e instanceof Error ? e.message : "Failed"}`);
    } finally {
      setAsking(false);
    }
  };
  const totalChars = agent.knowledge.reduce((n, k) => n + k.text.length, 0);

  return (
    <>
      <Panel
        title="AI agent"
        blurb="A virtual host on the public site that answers from your menu, site facts and uploaded knowledge files via OpenRouter. The key never ships to visitors: it stays on this device (demo), on the restaurant server, or as a Supabase secret."
        actions={
          <div className={cn("flex items-center gap-3 rounded-full border px-4 py-2", live ? "border-leaf bg-leaf/10" : "border-line bg-white/50")}>
            <span className={cn("h-3.5 w-3.5 rounded-full", live ? "bg-leaf shadow-[0_0_0_4px_rgba(76,175,80,0.25)] animate-pulse" : keyOk ? "bg-yellow" : "bg-ink/25")} aria-hidden />
            <span className="cond text-[14px] font-medium uppercase tracking-[0.1em]">{live ? "Working" : keyOk ? (agent.enabled ? "Needs a test" : "Verified · off") : "Not connected"}</span>
          </div>
        }
      >
        <Grid cols={3}>
          <Toggle checked={agent.enabled} onChange={(v) => setAgent({ enabled: v })} label="Show “Ask us” on the site" hint={mode === "demo" ? "Demo: works on this device only" : undefined} />
          <Field label="Assistant name">
            <TextInput value={agent.name} onChange={(v) => setAgent({ name: v })} />
          </Field>
          <Field label="Temperature" hint="0 = precise · 1 = creative">
            <input type="range" min={0} max={1} step={0.05} value={agent.temperature} onChange={(e) => setAgent({ temperature: Number(e.target.value) })} className="mt-3 w-full accent-black" aria-label="Temperature" />
          </Field>
        </Grid>
        <div className="mt-4">
          <Field label="Greeting">
            <TextArea value={agent.greeting} onChange={(v) => setAgent({ greeting: v })} rows={2} />
          </Field>
        </div>
      </Panel>

      <SkillsTasksPanel agent={agent} setAgent={setAgent} />

      <Panel title="OpenRouter API key" blurb="Get a key at openrouter.ai/keys. Free models cost nothing (rate-limited); paid models need credits on your OpenRouter account.">
        <div className="flex flex-wrap items-center gap-3">
          <StatusDot state={keyOk ? "ok" : "bad"} label={keyOk ? `Key configured ${secret?.hint ?? ""}` : "No key configured"} />
        </div>
        {secret?.managedExternally ? (
          <p className="mt-3 rounded-xl border border-line bg-white/40 px-3 py-2 text-[12.5px]">
            With Supabase the key is a function secret: <code className="rounded bg-ink/10 px-1">{secret.instructions}</code>
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={keyInput} onChange={(e) => setKeyInput(e.target.value)} type="password" placeholder="sk-or-v1-…" autoComplete="off" className="min-w-[260px] flex-1 rounded-lg border border-ink/20 bg-white/70 px-3 py-2 font-mono text-[13px] outline-none focus:border-ink" aria-label="OpenRouter API key" />
            <Btn variant="primary" onClick={saveKey} disabled={savingKey || !keyInput.trim()}>
              {savingKey ? "Saving…" : "Save key"}
            </Btn>
            {keyOk && (
              <Btn
                variant="danger"
                onClick={() => {
                  setKeyInput("");
                  void backend?.setSecret(token, "").then(setSecret);
                }}
              >
                Remove
              </Btn>
            )}
          </div>
        )}
      </Panel>

      <Panel
        title="Model"
        blurb={modelsLive ? `${groups.free.length} free and ${groups.paid.length} paid models loaded live from OpenRouter.` : "Showing a built-in list — the live catalogue couldn't be loaded from openrouter.ai."}
        actions={
          <Btn variant="accent" onClick={test} disabled={testing || !keyOk}>
            {testing ? "Testing…" : "Test connection"}
          </Btn>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px]">
            Selected: <code className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[12px]">{agent.model}</code> {selected && <span className="text-muted">· {priceLabel(selected)}</span>}
          </span>
          <StatusDot
            state={testOk ? "ok" : agent.lastTest ? "bad" : "idle"}
            label={agent.lastTest ? `${agent.lastTest.message} · ${new Date(agent.lastTest.at).toLocaleTimeString()}` : "Not tested yet"}
          />
        </div>
        {agent.lastTest && !agent.lastTest.ok && (
          <p className="mb-3 rounded-xl border border-yellow bg-yellow/20 px-3 py-2 text-[12.5px] leading-snug">
            Free OpenRouter models run on volunteer GPUs and often reply “Provider returned error” when that GPU is down. Click <strong>Test connection</strong> again — we’ll hop through other free models automatically until one answers, then turn “Ask us” on.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {(["free", "top", "paid"] as const).map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)} className={cn("rounded-full px-3 py-1.5 text-[12.5px]", group === g ? "bg-ink text-cream" : "bg-ink/5 hover:bg-ink/10")}>
              {g === "free" ? `Free (${groups.free.length})` : g === "top" ? `Top paid (${groups.top.length})` : `All paid (${groups.paid.length})`}
            </button>
          ))}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search models…" className="ml-auto min-w-[200px] rounded-full border border-ink/20 bg-white/70 px-3 py-1.5 text-[12.5px] outline-none focus:border-ink" aria-label="Search models" />
        </div>
        <ul className="mt-3 max-h-[320px] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-white/40">
          {list.length === 0 && <li className="px-3 py-4 text-[12.5px] text-muted">No models match.</li>}
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setAgent({ model: m.id })} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-yellow/30", agent.model === m.id && "bg-yellow/50")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{m.name}</span>
                  <span className="block truncate font-mono text-[11px] text-muted">{m.id}</span>
                </span>
                <span className="flex-none text-right text-[11px] text-muted">
                  {priceLabel(m)}
                  {m.context ? <span className="block">{Math.round(m.context / 1000)}k ctx</span> : null}
                </span>
                {agent.model === m.id && <Icon.Check size={16} className="flex-none" />}
              </button>
            </li>
          ))}
        </ul>
        <Field label="Or type a model id" className="mt-3">
          <TextInput value={agent.model} onChange={(v) => setAgent({ model: v })} mono />
        </Field>
      </Panel>

      <Panel title="Knowledge" blurb="What the assistant knows besides the menu: upload text files (menus, policies, FAQs, event info). Everything here is public-facing — don't upload private data.">
        <Field label="System prompt (personality & rules)">
          <TextArea value={agent.systemPrompt} onChange={(v) => setAgent({ systemPrompt: v })} rows={5} />
        </Field>
        <div className="mt-3">
          <Toggle checked={agent.includeMenu} onChange={(v) => setAgent({ includeMenu: v })} label="Include the full menu with prices" hint="Recommended — lets it answer “how much is the carbonara?”" />
        </div>
        <div className="mt-4 rounded-xl border border-yellow bg-yellow/15 p-3 sm:p-4">
          <p className="cond text-[15px] font-medium uppercase tracking-[0.06em]">
            <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ink text-[12px] text-cream">1</span>
            Get the template — Download, Copy, View, or fill it right here
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] leading-relaxed">
            <li>
              <strong>Download</strong> opens a Save dialog straight to your device. If this preview blocks it, use <strong>Copy</strong> (paste into Notepad, save as .md) or <strong>Fill in here</strong> (no file needed at all).
            </li>
            <li>
              Two block styles: <strong>TOPIC</strong> blocks for paragraphs about one subject, and <strong>Q&A</strong> blocks for guest questions with exact answers. Separate blocks with a line containing only <code className="rounded bg-ink/10 px-1 font-mono text-[11px]">---</code>.
            </li>
            <li>
              <strong>Fill it in</strong> yourself — or copy the AI prompt, paste it into ChatGPT / Claude / Gemini with your facts, and paste the result back.
            </li>
          </ol>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-cream/60 p-2.5">
              <p className="text-[12.5px] font-semibold">Blank template</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn small variant="primary" onClick={() => void downloadTemplate("blank")}>
                  <Icon.Download size={13} /> Download
                </Btn>
                <Btn small onClick={() => openTemplateTab("blank")} title="Open the template as text in a new tab — save it with Ctrl/Cmd + S">
                  Open tab
                </Btn>
                <Btn small onClick={() => void copyText(buildTemplateMd(), "blank")}>{tplCopied === "blank" ? "Copied!" : "Copy"}</Btn>
                <Btn small onClick={() => setShowTpl(showTpl === "blank" ? null : "blank")}>{showTpl === "blank" ? "Hide" : "View"}</Btn>
                <Btn small onClick={() => loadTemplateIntoPasteBox("blank")} title="Put the blank template in the editor below so you can fill it in here">
                  Fill in here
                </Btn>
              </div>
            </div>
            <div className="rounded-lg border border-line bg-cream/60 p-2.5">
              <p className="text-[12.5px] font-semibold">Filled example</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Btn small variant="primary" onClick={() => void downloadTemplate("example")}>
                  <Icon.Download size={13} /> Download
                </Btn>
                <Btn small onClick={() => openTemplateTab("example")} title="Open the example as text in a new tab">
                  Open tab
                </Btn>
                <Btn small onClick={() => void copyText(buildExampleMd(), "example")}>{tplCopied === "example" ? "Copied!" : "Copy"}</Btn>
                <Btn small onClick={() => setShowTpl(showTpl === "example" ? null : "example")}>{showTpl === "example" ? "Hide" : "View"}</Btn>
                <Btn small onClick={() => loadTemplateIntoPasteBox("example")} title="Put the filled example in the editor below">
                  Try it
                </Btn>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <Btn small onClick={() => void copyAiPrompt()}>{promptCopied ? "Copied — paste it into your AI chat" : "Copy AI fill-in prompt"}</Btn>
          </div>
          {tplMsg && <p className="mt-2 rounded-lg border border-line bg-white/60 px-3 py-2 text-[12px]">{tplMsg}</p>}
          {showTpl && (
            <div className="mt-2">
              <textarea readOnly rows={10} value={showTpl === "blank" ? buildTemplateMd() : buildExampleMd()} onFocus={(e) => e.target.select()} className="w-full rounded-lg border border-ink/20 bg-white/70 px-3 py-2 font-mono text-[11.5px] leading-relaxed outline-none" aria-label={showTpl === "blank" ? "Blank template text" : "Filled example text"} />
              <p className="mt-1 text-[11.5px] text-muted">Select all (Ctrl/Cmd + A), copy, fill it in, then paste it in Step 3 or upload it as a .md file in Step 2.</p>
            </div>
          )}
          <p className="mt-2 text-[11.5px] text-muted">Example entries inside the blank template are skipped on upload — only your filled blocks are added.</p>
        </div>

        <div
          id="knowledge-upload"
          className={cn("mt-4 rounded-xl border-2 border-dashed p-4 text-center transition sm:p-5", dragOver ? "border-ink bg-yellow/30" : "border-yellow bg-yellow/10")}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void addFiles(e.dataTransfer.files.length ? (e.dataTransfer as unknown as { files: FileList }).files : null);
          }}
        >
          <p className="cond text-[15px] font-medium uppercase tracking-[0.06em]">
            <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ink text-[12px] text-cream">2</span>
            Upload the filled template here
          </p>
          <p className="mx-auto mt-1 max-w-[560px] text-[12px] leading-relaxed text-muted">
            Drop your filled <strong>.md or .txt template</strong> (or .csv .json .html) here — or pick files below. Filled TOPIC and Q&A blocks split into separate entries automatically.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <input ref={fileRef} id="knowledge-file-input" type="file" accept={ACCEPT_KNOWLEDGE} multiple className="sr-only" onChange={(e) => void addFiles(e.target.files)} />
            <label htmlFor="knowledge-file-input" className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-cream transition hover:bg-black">
              <Icon.Upload size={15} /> Choose files to upload
            </label>
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            {ACCEPT_KNOWLEDGE.replace(/\./g, " ").trim()} · {agent.knowledge.length} entr{agent.knowledge.length === 1 ? "y" : "ies"} · {totalChars.toLocaleString()} characters (PDF/Word: export as text or markdown first)
          </p>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div id="bulk-paste-box">
            <p className="cond mb-2 text-[15px] font-medium uppercase tracking-[0.06em]">
              <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-ink text-[12px] text-cream">3</span>
              Or paste it here — no file needed
            </p>
            <Field label="Paste bulk text (from your AI chat or the template)" hint="TOPIC blocks and Q: / A: pairs, separated by --- lines. Preview count appears as you type.">
              <TextArea value={bulkText} onChange={(v) => setBulkText(v)} rows={9} mono placeholder={"## TOPIC: Happy Hour\nHappy Hour runs daily from 4:00 PM to 7:00 PM...\n\n---\n## Q&A\nQ: Do you have vegetarian pasta?\nA: Yes. Try the Spicy Marinara at ₱320..."} />
            </Field>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Btn small variant="primary" onClick={importBulkText} disabled={!bulkText.trim()}>
                <Icon.Plus size={13} /> Add {(() => { const n = parseBulkKnowledge(bulkText).length; return n > 0 ? `${n} ${n === 1 ? "entry" : "entries"}` : "entries"; })()}
              </Btn>
              {bulkText.trim() && (
                <span className="text-[11.5px] text-muted">
                  {(() => {
                    const found = parseBulkKnowledge(bulkText);
                    return found.length === 0 ? "No TOPIC or Q&A blocks detected yet." : `${found.filter((e) => e.kind === "qa").length} Q&A · ${found.filter((e) => e.kind === "topic").length} topics detected`;
                  })()}
                </span>
              )}
            </div>
            {bulkMsg && <p className="mt-2 rounded-lg border border-line bg-white/50 px-3 py-2 text-[12px]">{bulkMsg}</p>}
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-white/40 p-3">
              <p className="cond text-[14px] font-medium uppercase tracking-[0.06em]">Quick add — Q&A</p>
              <div className="mt-2 space-y-2">
                <TextInput value={qaQ} onChange={setQaQ} placeholder="Question guests ask, e.g. Do you have vegetarian pasta?" />
                <TextArea value={qaA} onChange={setQaA} rows={3} placeholder="Exact answer, e.g. Yes. Try the Spicy Marinara at ₱320..." />
                <Btn small variant="primary" onClick={addQaEntry} disabled={!qaQ.trim() || !qaA.trim()}>
                  <Icon.Plus size={13} /> Add Q&A
                </Btn>
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white/40 p-3">
              <p className="cond text-[14px] font-medium uppercase tracking-[0.06em]">Quick add — Topic</p>
              <div className="mt-2 space-y-2">
                <TextInput value={topicTitle} onChange={setTopicTitle} placeholder="Subject, e.g. Happy Hour" />
                <TextArea value={topicBody} onChange={setTopicBody} rows={4} placeholder="Paragraphs about this one subject — times, prices, facts..." />
                <Btn small variant="primary" onClick={addTopicEntry} disabled={!topicTitle.trim() || !topicBody.trim()}>
                  <Icon.Plus size={13} /> Add topic
                </Btn>
              </div>
            </div>
          </div>
        </div>
        {agent.knowledge.length > 0 && (
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white/40">
            {agent.knowledge.map((k) => {
              const kind = kindOf(k);
              const expanded = previewEntry === k.id;
              return (
                <li key={k.id} className="px-3 py-2 text-[13px]">
                  <div className="flex items-center gap-3">
                    <span className={cn("flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", kind === "Q&A" ? "bg-ink text-cream" : "bg-yellow/70 text-ink")}>{kind}</span>
                    <button type="button" onClick={() => setPreviewEntry(expanded ? null : k.id)} className="min-w-0 flex-1 text-left" aria-expanded={expanded}>
                      <span className="block truncate font-medium">{k.name}</span>
                      <span className="block text-[11px] text-muted">
                        {formatBytes(k.size)} · {k.text.length.toLocaleString()} chars{k.size > k.text.length * 1.2 ? " (truncated)" : ""} · {new Date(k.addedAt).toLocaleDateString()}
                      </span>
                    </button>
                    <Btn small variant="danger" onClick={() => setAgent({ knowledge: agent.knowledge.filter((x) => x.id !== k.id) })}>
                      Remove
                    </Btn>
                  </div>
                  {expanded && (
                    <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-line rounded-lg bg-cream/60 px-3 py-2 text-[12.5px] leading-relaxed">{k.text}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Try it" blurb="Ask a question exactly as a guest would. Uses the current draft settings.">
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void ask()} placeholder="Do you have vegetarian pasta?" className="flex-1 rounded-full border border-ink/20 bg-white/70 px-4 py-2 text-[14px] outline-none focus:border-ink" aria-label="Test question" />
          <Btn variant="primary" onClick={ask} disabled={asking || !q.trim() || !keyOk}>
            {asking ? "Asking…" : "Ask"}
          </Btn>
        </div>
        {answer && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-yellow/30 px-4 py-3 text-[14px] leading-[1.6]">
            {cleanAgentText(answer)}
          </p>
        )}
      </Panel>
    </>
  );
}

function SkillsTasksPanel({
  agent,
  setAgent,
}: {
  agent: { skills?: import("@/data/agentSkills").SkillDef[]; tasks?: AgentTask[] };
  setAgent: (patch: { skills?: import("@/data/agentSkills").SkillDef[]; tasks?: AgentTask[] }) => void;
}) {
  const skills = mergeSkills(agent.skills);
  const tasks = agent.tasks?.length ? agent.tasks : DEFAULT_TASKS;
  return (
    <Panel
      title="Skills & tasks"
      blurb="Skills are what the bots are allowed to do. Guest skills power “Ask us” on the website. Staff skills power the Copilot on the admin and floor dashboards (financials, briefs, inventory, live orders). Tasks are saved jobs you can tap to run."
    >
      <p className="kicker mb-2 text-muted">Guest — public site</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {skills
          .filter((s) => s.audience === "guest")
          .map((s) => (
            <Toggle key={s.id} checked={s.enabled} onChange={(v) => setAgent({ skills: skills.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)) })} label={s.label} hint={s.blurb} />
          ))}
      </div>
      <p className="kicker mb-2 mt-5 text-muted">Staff — copilot</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {skills
          .filter((s) => s.audience === "staff")
          .map((s) => (
            <Toggle key={s.id} checked={s.enabled} onChange={(v) => setAgent({ skills: skills.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)) })} label={s.label} hint={s.blurb} />
          ))}
      </div>
      <p className="kicker mb-2 mt-5 text-muted">Standing tasks</p>
      <ListEditor
        items={tasks}
        onChange={(next) => setAgent({ tasks: next })}
        create={newTask}
        summary={(t) => `${t.title} · ${t.when}${t.enabled ? "" : " · off"}`}
        addLabel="Add task"
        render={(t, up) => (
          <div className="space-y-3">
            <Grid cols={3}>
              <Field label="Title">
                <TextInput value={t.title} onChange={(v) => up({ title: v })} />
              </Field>
              <Field label="When">
                <Select value={t.when} onChange={(v) => up({ when: v as TaskWhen })} options={[{ value: "morning", label: "Morning" }, { value: "afternoon", label: "Afternoon" }, { value: "on-demand", label: "On demand" }]} />
              </Field>
              <Field label="Skill">
                <Select value={t.skill} onChange={(v) => up({ skill: v as SkillId })} options={DEFAULT_SKILLS.map((s) => ({ value: s.id, label: s.label }))} />
              </Field>
            </Grid>
            <Toggle checked={t.enabled} onChange={(v) => up({ enabled: v })} label="Enabled" />
            <Field label="Instructions" hint="What the copilot should produce when this task is run">
              <TextArea value={t.instructions} onChange={(v) => up({ instructions: v })} rows={4} />
            </Field>
          </div>
        )}
      />
    </Panel>
  );
}
