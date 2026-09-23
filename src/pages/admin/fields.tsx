import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { useApp } from "@/context/AppContext";
import { useSite } from "@/context/SiteContext";
import { photos } from "@/data/assets";
import { embedUrlFor, formatBytes, kindFromUrl, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/media";
import { Icon } from "@/components/ui";

/* ------------------------------- Admin context ------------------------------ */
export const AdminCtx = createContext<{ token: string }>({ token: "" });
export const useAdminToken = () => useContext(AdminCtx).token;

/* --------------------------------- Layout ---------------------------------- */
export function Panel({ title, blurb, children, actions, className }: { title: string; blurb?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-5 rounded-2xl border border-line bg-cream p-4 sm:p-6", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-[26px]">{title}</h2>
          {blurb && <p className="mt-1 max-w-[640px] text-[13px] text-muted">{blurb}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="kicker block text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function Grid({ children, cols = 2 }: { children: ReactNode; cols?: 1 | 2 | 3 | 4 }) {
  return <div className={cn("grid gap-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3", cols === 4 && "sm:grid-cols-2 lg:grid-cols-4")}>{children}</div>;
}

const inputCls = "w-full rounded-lg border border-ink/20 bg-white/70 px-3 py-2 text-[14px] outline-none focus:border-ink disabled:opacity-50";

export function TextInput({ value, onChange, placeholder, type = "text", mono, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; mono?: boolean; disabled?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} disabled={disabled} className={cn(inputCls, mono && "font-mono text-[13px]")} />;
}

export function NumberInput({ value, onChange, min, max, step = 1, placeholder }: { value: number | ""; onChange: (v: number | "") => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      type="number"
      min={min}
      max={max}
      step={step}
      inputMode="decimal"
      placeholder={placeholder}
      className={cn(inputCls, "tabular-nums")}
    />
  );
}

export function TextArea({ value, onChange, rows = 3, placeholder, mono }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; mono?: boolean }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className={cn(inputCls, "resize-y", mono && "font-mono text-[12.5px]")} />;
}

export function Select({ value, onChange, options, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputCls}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-lg border border-line bg-white/40 px-3 py-2 text-left">
      <span className={cn("relative h-6 w-11 flex-none rounded-full transition", checked ? "bg-leaf" : "bg-ink/20")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-6" : "left-1")} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium">{label}</span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
    </button>
  );
}

export function ColorField({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  const valid = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-white/40 p-2">
      <label className="relative h-11 w-11 flex-none cursor-pointer overflow-hidden rounded-lg ring-1 ring-ink/15" style={{ background: value }}>
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(e) => {
            setText(e.target.value);
            onChange(e.target.value);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={`${label} colour`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
      </div>
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value)) onChange(e.target.value);
        }}
        className={cn("w-[92px] rounded-md border bg-white/70 px-2 py-1 font-mono text-[12px] outline-none", valid ? "border-ink/20" : "border-red-500")}
        aria-label={`${label} hex`}
      />
    </div>
  );
}

export function Btn({ children, onClick, variant = "ghost", disabled, type = "button", small, className, title }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "danger" | "accent"; disabled?: boolean; type?: "button" | "submit"; small?: boolean; className?: string; title?: string }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        small ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 text-[13px]",
        variant === "primary" && "bg-ink text-cream hover:bg-black",
        variant === "accent" && "bg-yellow text-ink hover:bg-yellow-2",
        variant === "ghost" && "border border-ink/25 bg-white/50 hover:border-ink",
        variant === "danger" && "border border-red-300 text-red-700 hover:bg-red-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusDot({ state, label, pulse }: { state: "ok" | "warn" | "bad" | "idle"; label: ReactNode; pulse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px]">
      <span className={cn("h-2.5 w-2.5 rounded-full", state === "ok" && "bg-leaf", state === "warn" && "bg-yellow", state === "bad" && "bg-red-500", state === "idle" && "bg-ink/25", pulse && "animate-pulse")} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

/* -------------------------------- List editor ------------------------------- */
export function ListEditor<T extends { id: string }>({
  items,
  onChange,
  create,
  render,
  summary,
  addLabel = "Add",
  emptyText = "Nothing here yet.",
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  summary?: (item: T) => string;
  addLabel?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12px] text-muted">{emptyText}</p>}
      {items.map((item, i) => {
        const expanded = summary ? open === item.id : true;
        return (
          <div key={item.id} className="rounded-xl border border-line bg-white/40">
            <div className="flex items-center gap-2 px-3 py-2">
              {summary ? (
                <button type="button" className="min-w-0 flex-1 truncate text-left text-[13.5px] font-medium" onClick={() => setOpen(expanded ? null : item.id)} aria-expanded={expanded}>
                  <span className="mr-2 text-[11px] text-muted">{i + 1}.</span>
                  {summary(item) || <span className="text-muted">Untitled</span>}
                </button>
              ) : (
                <span className="flex-1 text-[11px] text-muted">{i + 1}.</span>
              )}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Move up">
                <Icon.ArrowUp size={14} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/10 disabled:opacity-30" aria-label="Move down">
                <Icon.ArrowDown size={14} />
              </button>
              <button type="button" onClick={() => onChange(items.filter((x) => x.id !== item.id))} className="grid h-8 w-8 place-items-center rounded-full text-red-700 hover:bg-red-50" aria-label="Delete">
                <Icon.Trash size={14} />
              </button>
            </div>
            {expanded && <div className="border-t border-line px-3 py-3">{render(item, (patch) => onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))))}</div>}
          </div>
        );
      })}
      <Btn onClick={() => onChange([...items, create()])} small>
        <Icon.Plus size={13} /> {addLabel}
      </Btn>
    </div>
  );
}

/* -------------------------------- Media picker ------------------------------ */
export function MediaPicker({ mediaKey, label, hint, allowVideo = true, compact }: { mediaKey: string; label: string; hint?: string; allowVideo?: boolean; compact?: boolean }) {
  const site = useSite();
  const token = useAdminToken();
  const { toast } = useApp();
  const asset = site.config.media[mediaKey];
  const resolved = asset ? site.resolveUrl(asset.url) : (photos[mediaKey] ?? "");
  const kind = asset?.kind ?? "image";
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const isVideo = f.type.startsWith("video/");
    if (isVideo && !allowVideo) return toast("This placement accepts images only.");
    if (isVideo && f.size > MAX_VIDEO_BYTES) return toast(`Video too large (${formatBytes(f.size)}). Max 80 MB.`);
    if (!isVideo && f.size > MAX_IMAGE_BYTES) return toast(`Image too large (${formatBytes(f.size)}). Max 25 MB.`);
    setBusy(true);
    try {
      const a = await site.uploadMedia(token, mediaKey, f);
      site.updateDraft((c) => ({ ...c, media: { ...c.media, [mediaKey]: { ...a, alt: label } } }));
      toast(`Uploaded ${f.name}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
      if (videoRef.current) videoRef.current.value = "";
    }
  };

  const useUrl = () => {
    const u = url.trim();
    if (!u) return;
    const k = kindFromUrl(u);
    if (k !== "image" && !allowVideo) return toast("This placement accepts images only.");
    const finalUrl = k === "embed" ? (embedUrlFor(u) ?? u) : u;
    site.updateDraft((c) => ({ ...c, media: { ...c.media, [mediaKey]: { url: finalUrl, kind: k, alt: label, name: u.split("/").pop() } } }));
    setUrl("");
    setUrlMode(false);
  };

  const remove = () =>
    site.updateDraft((c) => {
      const media = { ...c.media };
      delete media[mediaKey];
      return { ...c, media };
    });

  return (
    <div className={cn("rounded-xl border border-line bg-white/40 p-3", compact ? "flex gap-3" : "")}>
      <div className={cn("relative overflow-hidden rounded-lg bg-cream-2 ring-1 ring-ink/10", compact ? "h-20 w-28 flex-none" : "aspect-[16/10] w-full")}>
        {resolved ? (
          kind === "video" ? (
            <video src={resolved} className="h-full w-full object-cover" muted loop playsInline autoPlay />
          ) : kind === "embed" ? (
            <iframe src={resolved} title={label} className="h-full w-full" />
          ) : (
            <img src={resolved} alt="" className="h-full w-full object-contain" />
          )
        ) : (
          <div className="placeholder-photo grid h-full w-full place-items-center text-[10px] uppercase tracking-[0.2em]">Empty</div>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-cream/70 text-[11px] font-semibold uppercase tracking-[0.2em]">Uploading…</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-start justify-between gap-2", compact ? "" : "mt-3")}>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{label}</p>
            <p className="truncate text-[11px] text-muted">
              {asset ? `${asset.kind}${asset.name ? ` · ${asset.name}` : ""}` : resolved ? "bundled file" : "no file"}
              {hint ? ` · ${hint}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <Btn small onClick={() => fileRef.current?.click()} disabled={busy}>
            <Icon.Upload size={12} /> Image
          </Btn>
          {allowVideo && (
            <>
              <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
              <Btn small onClick={() => videoRef.current?.click()} disabled={busy}>
                <Icon.Upload size={12} /> Video
              </Btn>
            </>
          )}
          <Btn small onClick={() => setUrlMode((m) => !m)}>
            URL
          </Btn>
          {resolved && kind !== "embed" && (
            <a href={resolved} download={asset?.name || mediaKey} className="inline-flex items-center gap-1 rounded-full border border-ink/25 bg-white/50 px-3 py-1.5 text-[12px] hover:border-ink" title="Download this file to your device">
              <Icon.Download size={12} /> Download
            </a>
          )}
          {asset && (
            <Btn small variant="danger" onClick={remove}>
              Remove
            </Btn>
          )}
        </div>
        {urlMode && (
          <div className="mt-2 flex gap-2">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… image, .mp4 or YouTube/Vimeo link" className={cn(inputCls, "text-[12.5px]")} />
            <Btn small variant="primary" onClick={useUrl}>
              Use
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}

export function mediaKeyOptions(config: { media: Record<string, unknown> }, slots: { key: string; label: string }[]) {
  const seen = new Set<string>();
  const opts: { value: string; label: string }[] = [];
  for (const s of slots) {
    seen.add(s.key);
    opts.push({ value: s.key, label: `${s.label} (${s.key})` });
  }
  for (const k of Object.keys(config.media)) if (!seen.has(k)) opts.push({ value: k, label: k });
  return opts;
}
